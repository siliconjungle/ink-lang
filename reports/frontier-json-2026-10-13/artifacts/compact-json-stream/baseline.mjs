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
function __fn0(v0,v1,v2){
const v3=v0;
const v4=v1;
const v5=v2;
return __fn16(v3,v4,v5);}
function __fn1(v6){
return v6;}
function __fn2(){
const v7=({Ok:({})});
return ({["payload"]:v7});}
function __fn3(v8){
const v9=v8;
const v10=({Err:({Ok:({["item0"]:v9})})});
return ({["payload"]:v10});}
function __fn4(v11){
const v12=v11;
const v13=({Err:({Err:({Ok:({["item0"]:v12})})})});
return ({["payload"]:v13});}
function __fn5(v14){
const v15=v14;
const v16=({Err:({Err:({Err:({Ok:({["item0"]:v15})})})})});
return ({["payload"]:v16});}
function __fn6(v17){
const v18=v17;
const v19=({Err:({Err:({Err:({Err:({Ok:({["item0"]:v18})})})})})});
return ({["payload"]:v19});}
function __fn7(v20){
const v21=v20;
const v22=({Err:({Err:({Err:({Err:({Err:({["item0"]:v21})})})})})});
return ({["payload"]:v22});}
function __fn8(v23,v24){
const v25=v23;
let v26=({None:null});
for(let v27=v25.length-1;v27>=0;v27--){
const v28=v25[v27];
const v29=v28;
const v30=v29["key"];
const v31=v24;
let v32;if((v30===v31)){
const v33=v28;
v32=({Some:v33["value"]});}else{
v32=v26;}
v26=v32;
}
return v26;}
function __fn9(v34,v35){
const v36=v34;
const v37=v36;
const v38=v37["payload"];
let v39;if(Object.hasOwn(v38,"Ok")){
const v40=v38["Ok"];
v39=({Err:"ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedObject"});}else{
const v41=v38["Err"];
const v42=v41;
let v43;if(Object.hasOwn(v42,"Ok")){
const v44=v42["Ok"];
const v45=v44;
const v46=v45["item0"];
v43=({Err:"ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedObject"});}else{
const v47=v42["Err"];
const v48=v47;
let v49;if(Object.hasOwn(v48,"Ok")){
const v50=v48["Ok"];
const v51=v50;
const v52=v51["item0"];
v49=({Err:"ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedObject"});}else{
const v53=v48["Err"];
const v54=v53;
let v55;if(Object.hasOwn(v54,"Ok")){
const v56=v54["Ok"];
const v57=v56;
const v58=v57["item0"];
v55=({Err:"ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedObject"});}else{
const v59=v54["Err"];
const v60=v59;
let v61;if(Object.hasOwn(v60,"Ok")){
const v62=v60["Ok"];
const v63=v62;
const v64=v63["item0"];
v61=({Err:"ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedObject"});}else{
const v65=v60["Err"];
const v66=v65;
const v67=v66;
const v68=v67["item0"];
const v69=v68;
const v70=v35;
v61=({Ok:__fn8(v69,v70)});}
v55=v61;}
v49=v55;}
v43=v49;}
v39=v43;}
return v39;}
function __fn10(v71){
const v72=v71;
const v73=v72;
const v74=v73["payload"];
let v75;if(Object.hasOwn(v74,"Ok")){
const v76=v74["Ok"];
v75=({Err:"ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedObject"});}else{
const v77=v74["Err"];
const v78=v77;
let v79;if(Object.hasOwn(v78,"Ok")){
const v80=v78["Ok"];
const v81=v80;
const v82=v81["item0"];
v79=({Err:"ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedObject"});}else{
const v83=v78["Err"];
const v84=v83;
let v85;if(Object.hasOwn(v84,"Ok")){
const v86=v84["Ok"];
const v87=v86;
const v88=v87["item0"];
v85=({Err:"ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedObject"});}else{
const v89=v84["Err"];
const v90=v89;
let v91;if(Object.hasOwn(v90,"Ok")){
const v92=v90["Ok"];
const v93=v92;
const v94=v93["item0"];
v91=({Err:"ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedObject"});}else{
const v95=v90["Err"];
const v96=v95;
let v97;if(Object.hasOwn(v96,"Ok")){
const v98=v96["Ok"];
const v99=v98;
const v100=v99["item0"];
v97=({Err:"ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedObject"});}else{
const v101=v96["Err"];
const v102=v101;
const v103=v102;
const v104=v103["item0"];
v97=({Ok:v104});}
v91=v97;}
v85=v91;}
v79=v85;}
v75=v79;}
return v75;}
function __fn11(v105){
const v106=v105;
const v107=v106;
const v108=v107["payload"];
let v109;if(Object.hasOwn(v108,"Ok")){
const v110=v108["Ok"];
v109=({Err:"ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedArray"});}else{
const v111=v108["Err"];
const v112=v111;
let v113;if(Object.hasOwn(v112,"Ok")){
const v114=v112["Ok"];
const v115=v114;
const v116=v115["item0"];
v113=({Err:"ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedArray"});}else{
const v117=v112["Err"];
const v118=v117;
let v119;if(Object.hasOwn(v118,"Ok")){
const v120=v118["Ok"];
const v121=v120;
const v122=v121["item0"];
v119=({Err:"ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedArray"});}else{
const v123=v118["Err"];
const v124=v123;
let v125;if(Object.hasOwn(v124,"Ok")){
const v126=v124["Ok"];
const v127=v126;
const v128=v127["item0"];
v125=({Err:"ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedArray"});}else{
const v129=v124["Err"];
const v130=v129;
let v131;if(Object.hasOwn(v130,"Ok")){
const v132=v130["Ok"];
const v133=v132;
const v134=v133["item0"];
v131=({Ok:v134});}else{
const v135=v130["Err"];
const v136=v135;
const v137=v136;
const v138=v137["item0"];
v131=({Err:"ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedArray"});}
v125=v131;}
v119=v125;}
v113=v119;}
v109=v113;}
return v109;}
function __fn12(v139){
const v140=v139;
const v141=v140;
const v142=v141["payload"];
let v143;if(Object.hasOwn(v142,"Ok")){
const v144=v142["Ok"];
v143=({Err:"ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedString"});}else{
const v145=v142["Err"];
const v146=v145;
let v147;if(Object.hasOwn(v146,"Ok")){
const v148=v146["Ok"];
const v149=v148;
const v150=v149["item0"];
v147=({Err:"ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedString"});}else{
const v151=v146["Err"];
const v152=v151;
let v153;if(Object.hasOwn(v152,"Ok")){
const v154=v152["Ok"];
const v155=v154;
const v156=v155["item0"];
v153=({Err:"ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedString"});}else{
const v157=v152["Err"];
const v158=v157;
let v159;if(Object.hasOwn(v158,"Ok")){
const v160=v158["Ok"];
const v161=v160;
const v162=v161["item0"];
v159=({Ok:v162});}else{
const v163=v158["Err"];
const v164=v163;
let v165;if(Object.hasOwn(v164,"Ok")){
const v166=v164["Ok"];
const v167=v166;
const v168=v167["item0"];
v165=({Err:"ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedString"});}else{
const v169=v164["Err"];
const v170=v169;
const v171=v170;
const v172=v171["item0"];
v165=({Err:"ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedString"});}
v159=v165;}
v153=v159;}
v147=v153;}
v143=v147;}
return v143;}
function __fn13(v173){
const v174=v173;
const v175=v174;
const v176=v175["payload"];
let v177;if(Object.hasOwn(v176,"Ok")){
const v178=v176["Ok"];
v177=({Err:"ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedNumber"});}else{
const v179=v176["Err"];
const v180=v179;
let v181;if(Object.hasOwn(v180,"Ok")){
const v182=v180["Ok"];
const v183=v182;
const v184=v183["item0"];
v181=({Err:"ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedNumber"});}else{
const v185=v180["Err"];
const v186=v185;
let v187;if(Object.hasOwn(v186,"Ok")){
const v188=v186["Ok"];
const v189=v188;
const v190=v189["item0"];
v187=({Ok:v190});}else{
const v191=v186["Err"];
const v192=v191;
let v193;if(Object.hasOwn(v192,"Ok")){
const v194=v192["Ok"];
const v195=v194;
const v196=v195["item0"];
v193=({Err:"ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedNumber"});}else{
const v197=v192["Err"];
const v198=v197;
let v199;if(Object.hasOwn(v198,"Ok")){
const v200=v198["Ok"];
const v201=v200;
const v202=v201["item0"];
v199=({Err:"ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedNumber"});}else{
const v203=v198["Err"];
const v204=v203;
const v205=v204;
const v206=v205["item0"];
v199=({Err:"ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedNumber"});}
v193=v199;}
v187=v193;}
v181=v187;}
v177=v181;}
return v177;}
function __fn14(v207){
const v208=v207;
const v209=v208;
const v210=v209["payload"];
let v211;if(Object.hasOwn(v210,"Ok")){
const v212=v210["Ok"];
v211=({Err:"ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedBoolean"});}else{
const v213=v210["Err"];
const v214=v213;
let v215;if(Object.hasOwn(v214,"Ok")){
const v216=v214["Ok"];
const v217=v216;
const v218=v217["item0"];
v215=({Ok:v218});}else{
const v219=v214["Err"];
const v220=v219;
let v221;if(Object.hasOwn(v220,"Ok")){
const v222=v220["Ok"];
const v223=v222;
const v224=v223["item0"];
v221=({Err:"ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedBoolean"});}else{
const v225=v220["Err"];
const v226=v225;
let v227;if(Object.hasOwn(v226,"Ok")){
const v228=v226["Ok"];
const v229=v228;
const v230=v229["item0"];
v227=({Err:"ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedBoolean"});}else{
const v231=v226["Err"];
const v232=v231;
let v233;if(Object.hasOwn(v232,"Ok")){
const v234=v232["Ok"];
const v235=v234;
const v236=v235["item0"];
v233=({Err:"ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedBoolean"});}else{
const v237=v232["Err"];
const v238=v237;
const v239=v238;
const v240=v239["item0"];
v233=({Err:"ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedBoolean"});}
v227=v233;}
v221=v227;}
v215=v221;}
v211=v215;}
return v211;}
function __fn15(v241,v242,v243){
const v244=v242;
const v245=v243;
const v246=({["key"]:v244,["value"]:v245});
const v247=[v246];
const v248=v241;
const v249=v248.length;
const v250=[];
for(let v251=0;v251<v249;v251++){
const v252=v248[v251];
const v253=v252;
const v254=v253["key"];
const v255=v242;
if(!(v254===v255)){v250.push(v252);}
}
const v256=v250;
const v257=v247.length;
const v258=v256.length;
const v259=new Array(v257+v258);
for(let v260=0;v260<v257;v260++){v259[v260]=v247[v260];}
for(let v261=0;v261<v258;v261++){v259[v257+v261]=v256[v261];}
return v259;}
function __fn16(v262,v263,v264){
const v265=v262;
const v266=__fn10(v265);
let v267;if(Object.hasOwn(v266,"Ok")){
const v268=v266["Ok"];
const v269=v268;
const v270=v269;
const v271=v263;
const v272=v264;
const v273=__fn15(v270,v271,v272);
const v274=({Err:({Err:({Err:({Err:({Err:({["item0"]:v273})})})})})});
v267=({Ok:({["payload"]:v274})});}else{
const v275=v266["Err"];
v267=({Err:v275});}
return v267;}
function __fn17(v276,v277){
const v278=v276;
const v279=__fn10(v278);
let v280;if(Object.hasOwn(v279,"Ok")){
const v281=v279["Ok"];
const v282=v281;
const v283=v282;
const v284=v283.length;
const v285=[];
for(let v286=0;v286<v284;v286++){
const v287=v283[v286];
const v288=v287;
const v289=v288["key"];
const v290=v277;
if(!(v289===v290)){v285.push(v287);}
}
const v291=v285;
const v292=({Err:({Err:({Err:({Err:({Err:({["item0"]:v291})})})})})});
v280=({Ok:({["payload"]:v292})});}else{
const v293=v279["Err"];
v280=({Err:v293});}
return v280;}
function __fn18(v294,v295){
const v296=v294;
const v297=__fn10(v296);
let v298;if(Object.hasOwn(v297,"Ok")){
const v299=v297["Ok"];
const v300=v299;
const v301=v300;
const v302=v301.length;
const v303=[];
for(let v304=0;v304<v302;v304++){
const v305=v301[v304];
const v306=v295;
let v307=false;
for(let v308=0;v308<v306.length;v308++){
const v309=v306[v308];
const v310=v307;
let v311=v310;if(!v311){
const v312=v309;
const v313=v305;
const v314=v313["key"];
v311=(v312===v314);}
v307=v311;
}
if(v307){v303.push(v305);}
}
const v315=v303;
const v316=({Err:({Err:({Err:({Err:({Err:({["item0"]:v315})})})})})});
v298=({Ok:({["payload"]:v316})});}else{
const v317=v297["Err"];
v298=({Err:v317});}
return v298;}
function __into15(v318,v319,v320,v321){
const v322=v319;
const v323=v320;
const v324=({["key"]:v322,["value"]:v323});
const v325=[v324];
const v326=v318;
const v327=v326.length;
const v328=[];
for(let v329=0;v329<v327;v329++){
const v330=v326[v329];
const v331=v330;
const v332=v331["key"];
const v333=v319;
if(!(v332===v333)){v328.push(v330);}
}
const v334=v328;
const v335=v325.length;
const v336=v334.length;
for(let v337=0;v337<v335;v337++){
v321[0+v337]=v325[v337];
}
for(let v338=0;v338<v336;v338++){
v321[v335+v338]=v334[v338];
}
const v339=v335+v336;
return v339;}
const __namedTypes={"Row":{"fields":[{"name":"value","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"metadata","type":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"Row"},"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"},"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"kind":"ref","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"},"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"},"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"kind":"ref","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"},"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"},"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}};
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
// Fixed host subscription lifecycle. Dependencies come from checked effects;
// equality and ownership codecs are compiled from each query's result type.
function __createObservers(prepare){
 const subscriptions=new Map(),byRoot=new Map(),pending=new Set(),errors=[];
 let next=0,held=0,flushing=false;
 function report(s,error,phase){
  errors.push({query:s?.query??null,error,phase});
  if(s?.onError)try{s.onError(error);}catch(e){errors.push({query:s.query,error:e,phase:'error-handler'});}
 }
 function flush(){
  if(held||flushing||!pending.size)return;
  flushing=true;let passes=0;
  try{
   while(pending.size&&!held){
    if(++passes>1024){report(null,Error('subscription publication budget exhausted'),'publication');break;}
    const affected=new Set();
    for(const root of pending)for(const id of byRoot.get(root)||[])affected.add(id);
    pending.clear();const deliveries=[];
    // Evaluate all affected queries before calling any consumers.
    for(const id of affected){
     const s=subscriptions.get(id);if(!s)continue;
     try{const value=s.capture(s.read());if(!s.equal(s.value,value)){s.value=value;deliveries.push([s,value]);}}
     catch(e){report(s,e,'query');}
    }
    for(const [s,value]of deliveries)if(subscriptions.get(s.id)===s){
     try{s.callback(s.output(value));}catch(e){report(s,e,'listener');}
    }
   }
  }finally{flushing=false;}
 }
 return {
  get active(){return subscriptions.size!==0;},
  subscribe(query,args,callback,{immediate=true,onError}={}){
   if(typeof callback!=='function'||onError!==undefined&&typeof onError!=='function')throw TypeError('subscription callback');
   const q=prepare(query,args),s={...q,id:next++,query,callback,onError};
   s.value=s.capture(s.read());subscriptions.set(s.id,s);
   for(const root of s.roots){let ids=byRoot.get(root);if(!ids)byRoot.set(root,ids=new Set());ids.add(s.id);}
   const dispose=()=>{if(!subscriptions.delete(s.id))return;for(const root of s.roots){const ids=byRoot.get(root);ids.delete(s.id);if(!ids.size)byRoot.delete(root);}};
   if(immediate)try{callback(s.output(s.value));}catch(e){dispose();throw e;}
   return dispose;
  },
  commit(roots){if(!subscriptions.size)return;for(const root of roots)pending.add(root);flush();},
  hold(){held++;return new Set(pending);},
  release(){if(!held)throw Error('subscription boundary mismatch');held--;flush();},
  rollback(mark){pending.clear();for(const root of mark)pending.add(root);if(!held)throw Error('subscription boundary mismatch');held--;flush();},
  batch(callback){
   if(typeof callback!=='function'||Object.prototype.toString.call(callback)==='[object AsyncFunction]')throw TypeError('batch callback must be synchronous');held++;
   try{const value=callback();if(value&&typeof value.then==='function')throw TypeError('state batch callback must be synchronous');return value;}
   finally{held--;flush();}
  },
  flush,
  takeErrors(){return errors.splice(0);}
 };
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
  return [...keys,cell.key].sort((a,b)=>__keyCompare(a,b,rt.meta.roots[index].key));
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
 if(!rt.keeps)return;
 for(const keep of rt.meta.keepInvalidations[index]){
  if(!rt.keepDirty[keep]){rt.keepDirty[keep]=1;rt.keepUndoIndices[rt.keepUndoCount++]=keep;rt.keepBefore[keep]=rt.keeps[keep];}
  rt.keeps[keep]=undefined;
 }
}
function __restoreKeeps(rt){for(let i=rt.keepUndoCount-1;i>=0;i--){const keep=rt.keepUndoIndices[i];rt.keeps[keep]=rt.keepBefore[keep];}}
function __clearKeepJournal(rt){for(let i=0;i<rt.keepUndoCount;i++){const keep=rt.keepUndoIndices[i];rt.keepDirty[keep]=0;rt.keepBefore[keep]=undefined;}rt.keepUndoCount=0;}
function __rebuildViews(rt){
 for(const view of rt.views){let value=view.zero;for(const [key,row]of rt.tables[view.root])value=view.combine(value,view.contribution(key,row));rt.keeps[view.keep]=value;}
}
function __updateViews(rt,index,key,oldValue,newValue){
 if(rt.viewsByRoot[index].length===0)return null;
 const updates=rt.viewNext;
 for(const view of rt.viewsByRoot[index]){
  let value=rt.keeps[view.keep];
  if(oldValue!==undefined)value=view.combine(value,view.inverse(view.contribution(key,oldValue)));
  if(newValue!==undefined)value=view.combine(value,view.contribution(key,newValue));
  updates[view.keep]=value;
 }
 return updates;
}
function __installViews(rt,updates,index){if(updates)for(const view of rt.viewsByRoot[index])rt.keeps[view.keep]=updates[view.keep];}
function __writeCell(rt,index,key,next){if(rt.cellMode){if(rt.cell)throw Error('checked single-cell bound exceeded');rt.cell={index,key,next};}else{const table=rt.tables[index];if(table.has(key)!==(next!==undefined))__tableMembership(rt,index,key,next!==undefined);if(next===undefined)table.delete(key);else table.set(key,next);}}
function __commitCell(rt){const cell=rt.cell;if(!cell)return;const table=rt.tables[cell.index];if(table.has(cell.key)!==(cell.next!==undefined))__tableMembership(rt,cell.index,cell.key,cell.next!==undefined);if(cell.next===undefined)table.delete(cell.key);else table.set(cell.key,cell.next);rt.cell=null;}
class __DenseTable{
 constructor(capacity){this.limit=capacity;this.bigLimit=BigInt(capacity);this.dense=[];this.sparse=new Map();this.members=new Set();}
 slot(key){return (typeof key==='bigint'?key>=0n&&key<this.bigLimit:Number.isInteger(key)&&key>=0&&key<this.limit)?Number(key):-1;}
 get size(){return this.members.size;}
 get(key){const i=this.slot(key);return i<0?this.sparse.get(key):this.dense[i];}
 has(key){return this.get(key)!==undefined;}
 set(key,value){const i=this.slot(key);if(i<0)this.sparse.set(key,value);else this.dense[i]=value;this.members.add(key);return this;}
 delete(key){const i=this.slot(key);if(i<0)this.sparse.delete(key);else this.dense[i]=undefined;return this.members.delete(key);}
 keys(){return this.members.keys();}
 *values(){for(const key of this.members)yield this.get(key);}
 *entries(){for(const key of this.members)yield [key,this.get(key)];}
 [Symbol.iterator](){return this.entries();}
}
function __newTables(meta,prefixes,old){return meta.roots.map((_,i)=>{const t=prefixes[i]?new __DenseTable(prefixes[i]):new Map();if(old)for(const [k,v]of old[i])t.set(k,v);return t;});}
function __cachedKeep(ctx,rt,index,compute){const prior=rt.keeps[index];if(prior!==undefined)return prior;const value=compute(ctx,rt);rt.keeps[index]=value;return value;}
function __table(rt,index,method,args){
 const key=args[0];
 if(method==='get'){const value=__cellGet(rt,index,key);return value===undefined?{None:null}:{Some:value};}
 if(method==='contains')return __cellGet(rt,index,key)!==undefined;
 const table=rt.tables[index];
 if(method==='values'||method==='keys'){const keys=__orderedKeys(rt,index);return method==='keys'?keys.slice():keys.map(k=>__cellGet(rt,index,k));}
 if(method==='intersect_table'){const current=__readTable(rt,index),other=__readTable(rt,args[0]),small=current.size<=other.size?current:other,large=small===current?other:current;const result=[];for(const k of small.keys())if(large.has(k))result.push(k);return result.sort((a,b)=>__keyCompare(a,b,rt.meta.roots[index].key));}
 if(method==='intersect_keys'){const selected=new Set(args[0]);return __orderedKeys(rt,index).filter(k=>selected.has(k));}
 if(method==='put_many'){const keys=args[0],values=args[1];if(keys.length!==values.length)return {Err:'table bulk length mismatch'};for(let i=0;i<keys.length;i++)__table(rt,index,'put',[keys[i],values[i]]);return {Ok:null};}
 if(method==='remove_many'){for(const k of args[0])__table(rt,index,'remove',[k]);return null;}
 // Checked table values never use undefined (Unit uses null), so one lookup
 // distinguishes absence without a second hash probe.
 if(method==='remove'){const value=table.get(key),present=value!==undefined;if(present){const updates=__updateViews(rt,index,key,value,undefined);__invalidateKeeps(rt,index);__remember(rt,index,key,true,value);__writeCell(rt,index,key,undefined);__installViews(rt,updates,index);}return present?{Some:value}:{None:null};}
 const prior=table.get(key),present=prior!==undefined;
 if(method==='insert'&&present)throw Error('insert key already present');
 if(method==='replace'&&!present)throw Error('replace key absent');
 if(present&&__stateRootEquals[index](prior,args[1]))return null;
 const updates=__updateViews(rt,index,key,prior,args[1]);
 __invalidateKeeps(rt,index);
 __remember(rt,index,key,present,prior);__writeCell(rt,index,key,args[1]);__installViews(rt,updates,index);return null;
}
function __rollback(rt,mark){for(let i=rt.undo.length-1;i>=mark;i--){const [index,key,present,value]=rt.undo[i];const table=rt.tables[index];if(table.has(key)!==present)__tableMembership(rt,index,key,present);if(present)table.set(key,value);else table.delete(key);}rt.undo.length=mark;}
function __createState(meta,implementations,captures=null,views=[],prefixes=[]){
 const rt={meta,tables:__newTables(meta,prefixes),version:0n,outbox:[],staged:[],busy:false,undo:[],seen:meta.roots.map(()=>new Set()),host:null,keeps:new Array(meta.keeps.length),keepDirty:meta.keeps.length?new Uint8Array(meta.keeps.length):null,keepUndoIndices:meta.keeps.length?new Uint32Array(meta.keeps.length):null,keepUndoCount:0};
 rt.views=views;rt.viewsByRoot=meta.roots.map((_,root)=>views.filter(v=>v.root===root));__rebuildViews(rt);
 rt.viewNext=new Array(meta.keeps.length);rt.cell=null;rt.cellMode=false;rt.ctx={fuel:100000000};
 rt.keepBefore=meta.keeps.length?new Array(meta.keeps.length):null;
 rt.changedRoots=new Set();
 const actionMap=new Map(meta.actions.map(a=>[a.name,{...a,inputs:captures?captures[a.index]:a.params.map(p=>__stateCapture(p.type)),output:__stateResult(a.result)}]));
 const eventOutput=new Map(meta.events.map(e=>[e.name,__stateResult(e.type)]));
 const prepared=new WeakMap();
 const observers=rt.observers=__createObservers((name,args)=>{
  const a=actionMap.get(name);if(!a||a.change)throw Error('subscription requires a readonly query');
  const captured=a.inputs.map((convert,i)=>convert(args[i]));
  const publicArgs=captured.map((v,i)=>__stateResult(a.params[i].type)(v));
  return {roots:a.roots,read:()=>run(a,publicArgs,null,null,true),capture:__stateCapture(a.result),output:a.output,equal:__stateQueryEquals[a.index]};
 });
 function invoke(name,args){const a=actionMap.get(name);if(!a)throw Error(`unknown action ${name}`);return run(a,args);}
 function read(a,args,inputs,output,resultOnly,owned=false){
  if(rt.busy)throw Error('state operation already in progress');
  const captured=owned?args:(inputs||a.inputs).map((convert,i)=>convert(args[i]));
  const ctx=rt.ctx;ctx.fuel=100000000;
  if(a.precondition && implementations[actionMap.get(a.precondition).index](ctx,rt,...captured)!==true)throw Error('contract precondition failed');
  rt.busy=true;
  try{const value=implementations[a.index](ctx,rt,...captured),result=a.freshResult?value:(output||a.output)(value);return resultOnly?result:{result,committed:false,version:rt.version,events:[]};}
  finally{rt.busy=false;}
 }
 function run(a,args,inputs=null,output=null,resultOnly=false,owned=false){
  if(!a.change)return read(a,args,inputs,output,resultOnly,owned);
  if(rt.busy)throw Error('state operation already in progress');
  const captured=owned?args:(inputs||a.inputs).map((convert,i)=>convert(args[i]));
  const ctx=rt.ctx;ctx.fuel=100000000;
  if(a.precondition && implementations[actionMap.get(a.precondition).index](ctx,rt,...captured)!==true)throw Error('contract precondition failed');
  const mark=rt.undo.length,version=rt.version,outbox=rt.outbox,outboxLength=rt.outbox.length;
  rt.busy=true;rt.cellMode=a.singleCell&&!rt.host;rt.staged.length=0;rt.changedRoots.clear();let successful=false;
  try{
   const value=implementations[a.index](ctx,rt,...captured);
   const result=a.freshResult?value:(output||a.output)(value);
   if(a.fallible && Object.hasOwn(value,'Err')){__rollback(rt,mark);__restoreKeeps(rt);if(rt.host?.strict)rt.host.failure=Object.assign(Error('transaction action failed'),{action:a.name,result});return resultOnly?result:{result,committed:false,version,events:[]};}
   if(version===18446744073709551615n)throw Error('commit sequence exhausted');
   const next=version+1n;
   const events=resultOnly?null:new Array(rt.staged.length);
   for(let i=0;i<rt.staged.length;i++){
    const [channel,value]=rt.staged[i],position=BigInt(i);
    rt.outbox.push({commit:next,position,channel,value});
    if(events)events[i]={commit:next,position,channel,value:eventOutput.get(channel)(value)};
   }
   __commitCell(rt);rt.version=next;
   successful=true;
   return resultOnly?result:{result,committed:true,version:next,events};
  }catch(e){__rollback(rt,mark);__restoreKeeps(rt);rt.version=version;rt.outbox=outbox;rt.outbox.length=outboxLength;if(rt.host?.strict)rt.host.failure=e;throw e;}
  finally{rt.cell=null;rt.cellMode=false;rt.staged.length=0;rt.busy=false;__clearKeepJournal(rt);for(const seen of rt.seen)seen.clear();if(!rt.host)rt.undo.length=0;if(successful)observers.commit(rt.changedRoots);}
 }
 return Object.freeze({
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
   if(!a.change&&!a.precondition&&inputs.length===0)return ()=>{
    if(rt.busy)throw Error('state operation already in progress');rt.busy=true;const ctx=rt.ctx;ctx.fuel=100000000;
    try{const value=implementations[a.index](ctx,rt),result=a.freshResult?value:a.output(value);return resultOnly?result:{result,committed:false,version:rt.version,events:[]};}finally{rt.busy=false;}
   };
   return __stateBoundFactories[a.index](run,a,inputs,a.output,resultOnly);
  },
  beginTransaction(){if(rt.busy||rt.host||rt.undo.length)throw Error('transaction already in progress');rt.host={version:rt.version,outbox:rt.outbox,length:rt.outbox.length,keeps:rt.keeps.slice(),notificationMark:observers.hold()};return true;},
  commitTransaction(){if(rt.busy||!rt.host)throw Error('no state transaction');if(rt.host.failure)throw rt.host.failure;rt.host=null;rt.undo.length=0;observers.release();},
  rollbackTransaction(){if(rt.busy||!rt.host)throw Error('no state transaction');__rollback(rt,0);rt.version=rt.host.version;rt.outbox=rt.host.outbox;rt.outbox.length=rt.host.length;rt.keeps=rt.host.keeps;const mark=rt.host.notificationMark;rt.host=null;observers.rollback(mark);},
  get version(){return rt.version;},
  get outbox(){return rt.outbox.map(e=>({...e,value:eventOutput.get(e.channel)(e.value)}));},
  acknowledgeThrough(commit,position){if(rt.busy)throw Error('state operation already in progress');commit=__stateWord(commit);position=__stateWord(position);const last=rt.outbox.at(-1);if(!last)return;if(last.commit<commit||(last.commit===commit&&last.position<=position)){if(rt.host)rt.outbox=[];else rt.outbox.length=0;return;}rt.outbox=rt.outbox.filter(e=>e.commit>commit||(e.commit===commit&&e.position>position));},
  async invokeAsync(name,args){
   if(typeof __parallelInvokeAsync!=='function')return invoke(name,args);
   if(rt.busy||rt.host)throw Error('parallel state call requires transaction boundary');const captured=structuredClone(args);rt.busy=true;observers.hold();let completed=false;
   try{const snapshot=await __snapshotEncode(meta,rt);const reply=await __parallelInvokeAsync(name,captured,snapshot);const s=await __snapshotDecode(meta,reply.snapshot);const candidate={...rt,tables:__newTables(meta,prefixes,s.tables),keeps:rt.keeps.map(()=>undefined)};__rebuildViews(candidate);rt.tables=candidate.tables;rt.version=s.version;rt.outbox=s.outbox;rt.keeps=candidate.keeps;completed=true;return reply.value;}finally{rt.busy=false;if(completed)observers.commit(meta.roots.map((_,i)=>i));observers.release();}
  },
  checkpoint(limits){if(rt.busy)throw Error('checkpoint requires transaction boundary');return __snapshotEncode(meta,rt,limits);},
  async restore(bytes,limits){if(rt.host)throw Error('restore during transaction');if(rt.busy)throw Error('restore requires transaction boundary');rt.busy=true;rt.ctx.fuel=100000000;observers.hold();let restored=false;try{const s=await __snapshotDecode(meta,bytes,limits);const candidate={...rt,tables:__newTables(meta,prefixes,s.tables),version:s.version,outbox:s.outbox,keeps:rt.keeps.map(()=>undefined)};__rebuildViews(candidate);for(const name of meta.invariantChecks||[]){const a=actionMap.get(name);if(implementations[a.index](rt.ctx,candidate)!==true)throw Error('snapshot violates state invariant');}rt.tables=candidate.tables;rt.version=s.version;rt.outbox=s.outbox;rt.keeps=candidate.keeps;restored=true;}finally{rt.busy=false;if(restored)observers.commit(meta.roots.map((_,i)=>i));observers.release();}},
 });
}
function __action0(ctx,rt,s0,s1,s2){__tick(ctx);try{__tick(ctx);__table(rt,0,"put",[s0,s1]);__tick(ctx);rt.staged.push(["seen",(s1)["value"]]);__tick(ctx);if(s2){__tick(ctx);return ({Err:"Error.Failed"});}else{}__tick(ctx);return ({Ok:null});}catch(e){if(e instanceof __Abort)return {Err:e.value};throw e;}}
function __action1(ctx,rt,s3,s4){__tick(ctx);try{__tick(ctx);__table(rt,0,"remove",[s3]);__tick(ctx);rt.staged.push(["seen",0]);__tick(ctx);if(s4){__tick(ctx);return ({Err:"Error.Failed"});}else{}__tick(ctx);return ({Ok:null});}catch(e){if(e instanceof __Abort)return {Err:e.value};throw e;}}
function __action2(ctx,rt){__tick(ctx);__tick(ctx);return (__mapValue(__mapValue(__table(rt,0,"values",[]),"list","filter",(s5)=>{__tick(ctx);return (s5)["active"];}),"list","map",(s6)=>{__tick(ctx);return (s6)["value"];})).reduce((a,b)=>{__tick(ctx);return (((a) + (b)) >>> 0);},0);}
function __action3(ctx,rt,s7){__tick(ctx);__tick(ctx);return __table(rt,0,"get",[s7]);}
function __stateValueEqual14(a,b){if(a===b)return true;if(a.length!==b.length)return false;for(let i=0;i<a.length;i++)if(!(__stateValueEqual15(a[i],b[i])))return false;return true;}
function __stateValueEqual12(a,b){if(a===b)return true;if(a.length!==b.length)return false;for(let i=0;i<a.length;i++)if(!(__stateValueEqual1(a[i],b[i])))return false;return true;}
function __stateValueEqual0(a,b){if(a===b)return true;return (a["value"]===b["value"])&&(a["active"]===b["active"])&&__stateValueEqual1(a["metadata"],b["metadata"]);}
function __stateValueEqual9(a,b){if(a===b)return true;return (a["item0"]===b["item0"]);}
function __stateValueEqual13(a,b){if(a===b)return true;return __stateValueEqual14(a["item0"],b["item0"]);}
function __stateValueEqual7(a,b){if(a===b)return true;return (a["item0"]===b["item0"]);}
function __stateValueEqual5(a,b){if(a===b)return true;return (a["item0"]===b["item0"]);}
function __stateValueEqual11(a,b){if(a===b)return true;return __stateValueEqual12(a["item0"],b["item0"]);}
function __stateValueEqual3(a,b){if(a===b)return true;return true;}
function __stateValueEqual15(a,b){if(a===b)return true;return (a["key"]===b["key"])&&__stateValueEqual1(a["value"],b["value"]);}
function __stateValueEqual1(a,b){if(a===b)return true;return __stateValueEqual2(a["payload"],b["payload"]);}
function __stateValueEqual17(a,b){if(a===b)return true;const x=Object.hasOwn(a,'Some');return x===Object.hasOwn(b,'Some')&&(!x||__stateValueEqual0(a.Some,b.Some));}
function __stateValueEqual16(a,b){if(a===b)return true;const x=Object.hasOwn(a,'Ok');return x===Object.hasOwn(b,'Ok')&&(x?(a.Ok===b.Ok):(a.Err===b.Err));}
function __stateValueEqual8(a,b){if(a===b)return true;const x=Object.hasOwn(a,'Ok');return x===Object.hasOwn(b,'Ok')&&(x?__stateValueEqual9(a.Ok,b.Ok):__stateValueEqual10(a.Err,b.Err));}
function __stateValueEqual6(a,b){if(a===b)return true;const x=Object.hasOwn(a,'Ok');return x===Object.hasOwn(b,'Ok')&&(x?__stateValueEqual7(a.Ok,b.Ok):__stateValueEqual8(a.Err,b.Err));}
function __stateValueEqual4(a,b){if(a===b)return true;const x=Object.hasOwn(a,'Ok');return x===Object.hasOwn(b,'Ok')&&(x?__stateValueEqual5(a.Ok,b.Ok):__stateValueEqual6(a.Err,b.Err));}
function __stateValueEqual10(a,b){if(a===b)return true;const x=Object.hasOwn(a,'Ok');return x===Object.hasOwn(b,'Ok')&&(x?__stateValueEqual11(a.Ok,b.Ok):__stateValueEqual13(a.Err,b.Err));}
function __stateValueEqual2(a,b){if(a===b)return true;const x=Object.hasOwn(a,'Ok');return x===Object.hasOwn(b,'Ok')&&(x?__stateValueEqual3(a.Ok,b.Ok):__stateValueEqual4(a.Err,b.Err));}
function __ownedInput16(value,budget={cells:1000000},depth=0){if(depth>64||--budget.cells<0)throw Error('state input resource limit');if(!Array.isArray(value)&&!(ArrayBuffer.isView(value)&&!(value instanceof DataView)))throw Error('invalid list');const out=new Array(value.length);for(let i=0;i<out.length;i++)out[i]=__ownedInput17(value[i],budget,depth+1);return out;}
function __ownedInput13(value,budget={cells:1000000},depth=0){if(depth>64||--budget.cells<0)throw Error('state input resource limit');if(!Array.isArray(value)&&!(ArrayBuffer.isView(value)&&!(value instanceof DataView)))throw Error('invalid list');const out=new Array(value.length);for(let i=0;i<out.length;i++)out[i]=__ownedInput14(value[i],budget,depth+1);return out;}
function __ownedInput3(value,budget={cells:1000000},depth=0){if(depth>64||--budget.cells<0)throw Error('state input resource limit');if(!value||typeof value!=='object'||Array.isArray(value))throw Error('invalid Result');const keys=Object.keys(value);if(keys.length!==1)throw Error('invalid Result');const tag=keys[0];if(tag==='Ok')return {Ok:__ownedInput4(value.Ok,budget,depth+1)};if(tag==='Err')return {Err:__ownedInput5(value.Err,budget,depth+1)};throw Error('invalid Result');}
function __ownedInput5(value,budget={cells:1000000},depth=0){if(depth>64||--budget.cells<0)throw Error('state input resource limit');if(!value||typeof value!=='object'||Array.isArray(value))throw Error('invalid Result');const keys=Object.keys(value);if(keys.length!==1)throw Error('invalid Result');const tag=keys[0];if(tag==='Ok')return {Ok:__ownedInput6(value.Ok,budget,depth+1)};if(tag==='Err')return {Err:__ownedInput7(value.Err,budget,depth+1)};throw Error('invalid Result');}
function __ownedInput7(value,budget={cells:1000000},depth=0){if(depth>64||--budget.cells<0)throw Error('state input resource limit');if(!value||typeof value!=='object'||Array.isArray(value))throw Error('invalid Result');const keys=Object.keys(value);if(keys.length!==1)throw Error('invalid Result');const tag=keys[0];if(tag==='Ok')return {Ok:__ownedInput8(value.Ok,budget,depth+1)};if(tag==='Err')return {Err:__ownedInput9(value.Err,budget,depth+1)};throw Error('invalid Result');}
function __ownedInput9(value,budget={cells:1000000},depth=0){if(depth>64||--budget.cells<0)throw Error('state input resource limit');if(!value||typeof value!=='object'||Array.isArray(value))throw Error('invalid Result');const keys=Object.keys(value);if(keys.length!==1)throw Error('invalid Result');const tag=keys[0];if(tag==='Ok')return {Ok:__ownedInput10(value.Ok,budget,depth+1)};if(tag==='Err')return {Err:__ownedInput11(value.Err,budget,depth+1)};throw Error('invalid Result');}
function __ownedInput11(value,budget={cells:1000000},depth=0){if(depth>64||--budget.cells<0)throw Error('state input resource limit');if(!value||typeof value!=='object'||Array.isArray(value))throw Error('invalid Result');const keys=Object.keys(value);if(keys.length!==1)throw Error('invalid Result');const tag=keys[0];if(tag==='Ok')return {Ok:__ownedInput12(value.Ok,budget,depth+1)};if(tag==='Err')return {Err:__ownedInput15(value.Err,budget,depth+1)};throw Error('invalid Result');}
function __ownedInput4(value,budget={cells:1000000},depth=0){if(depth>64||--budget.cells<0)throw Error('state input resource limit');if(!value||typeof value!=='object'||Array.isArray(value))throw Error('invalid record');return {};}
function __ownedInput15(value,budget={cells:1000000},depth=0){if(depth>64||--budget.cells<0)throw Error('state input resource limit');if(!value||typeof value!=='object'||Array.isArray(value)||!Object.hasOwn(value,"item0"))throw Error('invalid record');const field0=__ownedInput16(value["item0"],budget,depth+1);return {["item0"]:field0};}
function __ownedInput12(value,budget={cells:1000000},depth=0){if(depth>64||--budget.cells<0)throw Error('state input resource limit');if(!value||typeof value!=='object'||Array.isArray(value)||!Object.hasOwn(value,"item0"))throw Error('invalid record');const field0=__ownedInput13(value["item0"],budget,depth+1);return {["item0"]:field0};}
function __ownedInput6(value,budget={cells:1000000},depth=0){if(depth>64||--budget.cells<0)throw Error('state input resource limit');if(!value||typeof value!=='object'||Array.isArray(value)||!Object.hasOwn(value,"item0"))throw Error('invalid record');let field0=value["item0"];if(depth+1>64||--budget.cells<0)throw Error('state input resource limit');if(typeof field0!=='boolean')throw Error('invalid Bool');return {["item0"]:field0};}
function __ownedInput10(value,budget={cells:1000000},depth=0){if(depth>64||--budget.cells<0)throw Error('state input resource limit');if(!value||typeof value!=='object'||Array.isArray(value)||!Object.hasOwn(value,"item0"))throw Error('invalid record');let field0=value["item0"];if(depth+1>64||--budget.cells<0)throw Error('state input resource limit');if(typeof field0!=='string'||!field0.isWellFormed())throw Error('invalid String');return {["item0"]:field0};}
function __ownedInput8(value,budget={cells:1000000},depth=0){if(depth>64||--budget.cells<0)throw Error('state input resource limit');if(!value||typeof value!=='object'||Array.isArray(value)||!Object.hasOwn(value,"item0"))throw Error('invalid record');let field0=value["item0"];if(depth+1>64||--budget.cells<0)throw Error('state input resource limit');if(typeof field0!=='string'||!field0.isWellFormed())throw Error('invalid String');return {["item0"]:field0};}
function __ownedInput17(value,budget={cells:1000000},depth=0){if(depth>64||--budget.cells<0)throw Error('state input resource limit');if(!value||typeof value!=='object'||Array.isArray(value)||!Object.hasOwn(value,"key")||!Object.hasOwn(value,"value"))throw Error('invalid record');let field0=value["key"];if(depth+1>64||--budget.cells<0)throw Error('state input resource limit');if(typeof field0!=='string'||!field0.isWellFormed())throw Error('invalid String');const field1=__ownedInput14(value["value"],budget,depth+1);return {["key"]:field0,["value"]:field1};}
function __ownedInput2(value,budget={cells:1000000},depth=0){if(depth>64||--budget.cells<0)throw Error('state input resource limit');if(!value||typeof value!=='object'||Array.isArray(value)||!Object.hasOwn(value,"payload"))throw Error('invalid record');const field0=__ownedInput3(value["payload"],budget,depth+1);return {["payload"]:field0};}
function __ownedInput1(value,budget={cells:1000000},depth=0){if(depth>64||--budget.cells<0)throw Error('state input resource limit');if(!value||typeof value!=='object'||Array.isArray(value)||!Object.hasOwn(value,"value")||!Object.hasOwn(value,"active")||!Object.hasOwn(value,"metadata"))throw Error('invalid record');let field0=value["value"];if(depth+1>64||--budget.cells<0)throw Error('state input resource limit');if(typeof field0!=='number'||!Number.isInteger(field0)||field0<0||field0>4294967295)throw Error('invalid u32');if(field0===0)field0=0;let field1=value["active"];if(depth+1>64||--budget.cells<0)throw Error('state input resource limit');if(typeof field1!=='boolean')throw Error('invalid Bool');const field2=__ownedInput2(value["metadata"],budget,depth+1);return {["value"]:field0,["active"]:field1,["metadata"]:field2};}
function __ownedInput18(value,budget={cells:1000000},depth=0){let scalar=value;if(depth>64||--budget.cells<0)throw Error('state input resource limit');if(typeof scalar!=='boolean')throw Error('invalid Bool');return scalar;}
function __ownedInput14(value,budget={cells:1000000},depth=0){if(depth>64||--budget.cells<0)throw Error('state input resource limit');return __ownedInput2(value,budget,depth+1);}
function __ownedInput0(value,budget={cells:1000000},depth=0){let scalar=value;if(depth>64||--budget.cells<0)throw Error('state input resource limit');if(typeof scalar!=='string'||!scalar.isWellFormed())throw Error('invalid String');return scalar;}
const __stateQueryEquals=[(a,b)=>__stateValueEqual16(a,b),(a,b)=>__stateValueEqual16(a,b),(a,b)=>(a===b),(a,b)=>__stateValueEqual17(a,b)];
const __stateRootEquals=[(a,b)=>__stateValueEqual0(a,b)];
const __stateBoundFactories=[(run,a,inputs,output,only)=>(p0,p1,p2)=>run(a,[inputs[0](p0),inputs[1](p1),inputs[2](p2)],null,output,only,true),(run,a,inputs,output,only)=>{const args=new Array(2);return (p0,p1)=>{args[0]=inputs[0](p0);args[1]=inputs[1](p1);return run(a,args,null,output,only,true);};},(run,a,inputs,output,only)=>{const args=new Array(0);return ()=>{return run(a,args,null,output,only,true);};},(run,a,inputs,output,only)=>{const args=new Array(1);return (p0)=>{args[0]=inputs[0](p0);return run(a,args,null,output,only,true);};}];
const __stateMetadata={"actions":[{"change":true,"fallible":true,"freshResult":true,"index":0,"name":"put","params":[{"name":"key","type":{"kind":"string"}},{"name":"row","type":{"fields":[{"name":"value","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"metadata","type":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"Row"}},{"name":"fail","type":{"kind":"bool"}}],"precondition":null,"result":{"error":{"kind":"enum","name":"Error","variants":["Error.Failed"]},"kind":"result","ok":{"kind":"unit"}},"roots":[0],"singleCell":true},{"change":true,"fallible":true,"freshResult":true,"index":1,"name":"erase","params":[{"name":"key","type":{"kind":"string"}},{"name":"fail","type":{"kind":"bool"}}],"precondition":null,"result":{"error":{"kind":"enum","name":"Error","variants":["Error.Failed"]},"kind":"result","ok":{"kind":"unit"}},"roots":[0],"singleCell":true},{"change":false,"fallible":false,"freshResult":true,"index":2,"name":"total","params":[],"precondition":null,"result":{"kind":"u32"},"roots":[0],"singleCell":true},{"change":false,"fallible":false,"freshResult":false,"index":3,"name":"row","params":[{"name":"key","type":{"kind":"string"}}],"precondition":null,"result":{"element":{"fields":[{"name":"value","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"metadata","type":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"Row"},"kind":"option"},"roots":[0],"singleCell":true}],"events":[{"name":"seen","snapshotType":{"kind":"u32"},"type":{"kind":"u32"}}],"invariantChecks":[],"keepInvalidations":[[]],"keeps":[],"roots":[{"key":{"kind":"string"},"name":"Rows","snapshotKey":{"kind":"string"},"snapshotValue":{"fields":[{"name":"value","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"metadata","type":{"body":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"body":{"fields":[{"name":"item0","type":{"element":{"body":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record"},"kind":"bind","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record"},"kind":"bind","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"body":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record"},"kind":"bind","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record"}},"kind":"result","ok":{"fields":[],"kind":"record"}}}],"kind":"record"},"kind":"bind","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record"},"value":{"fields":[{"name":"value","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"metadata","type":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"Row"}}],"snapshot":{"program":[170,2,160,201,22,34,6,102,106,120,127,195,108,222,134,87,107,18,249,205,65,4,204,37,145,133,33,239,56,73,0,121],"schema":[215,31,142,65,238,22,48,236,29,237,247,185,248,201,46,30,164,196,64,247,0,243,34,135,232,15,229,166,43,18,34,88]}};const __actions=[__action0,__action1,__action2,__action3];const __stateInputCaptures=[[__ownedInput0,__ownedInput1,__ownedInput18],[__ownedInput0,__ownedInput18],[],[__ownedInput0]];
export function createState(){return __createState(__stateMetadata,__actions,__stateInputCaptures);}
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v8","core_sha256":"011e1e96f60d9e2e64eeb79b7ac93de4adf862c65bdd7014ef43f59ffa24996c","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"f32_storage":"exact-u32-bits","functions":[{"destination":null,"index":0,"internal":false,"name":"set_document","parallel":false,"params":[{"name":"document","type":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}},{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"precondition":null,"result":{"error":{"kind":"enum","name":"ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb","variants":["ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedObject","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedArray","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedBoolean","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedNumber","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedString"]},"kind":"result","ok":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}},{"destination":null,"index":1,"internal":false,"name":"identity","parallel":false,"params":[{"name":"document","type":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"precondition":null,"result":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}},{"destination":null,"index":2,"internal":false,"name":"ink_m5c5479101d38cd5d28f66110c880ad28b6ee3ee64fddb98300dda927c645c107","parallel":false,"params":[],"precondition":null,"result":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}},{"destination":null,"index":3,"internal":false,"name":"ink_mbf312e22e5ab893385ef1935f8250f16e090d4da8dd41bc1577df1ba636fdc13","parallel":false,"params":[{"name":"value","type":{"kind":"bool"}}],"precondition":null,"result":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}},{"destination":null,"index":4,"internal":false,"name":"ink_mee36d9721e4db57ba82a41d18344d03b18dc98a5d22319238b436d9aa6c8a6c1","parallel":false,"params":[{"name":"token","type":{"kind":"string"}}],"precondition":null,"result":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}},{"destination":null,"index":5,"internal":false,"name":"ink_mca67a4ea249e8eba3cf6e453e86dd061695d9d9afaf7edcf587f8cd1cbc055c9","parallel":false,"params":[{"name":"value","type":{"kind":"string"}}],"precondition":null,"result":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}},{"destination":null,"index":6,"internal":false,"name":"ink_me5c9745ee2d98ddc2c32843ec24ea225963aff43ce357055dd9a61b18d1d4982","parallel":false,"params":[{"name":"values","type":{"element":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"precondition":null,"result":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}},{"destination":null,"index":7,"internal":false,"name":"ink_mb0e8aa1d34f7cc5fc940000b63bdc043068202b64206a7da02cade0c4e386a22","parallel":false,"params":[{"name":"members","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"precondition":null,"result":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}},{"destination":null,"index":8,"internal":false,"name":"ink_m2383a37c8f0f060d8454d784560b1928c68c5b404b4b5fd5bfff2e7fa4fddcbe","parallel":false,"params":[{"name":"members","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}},{"name":"key","type":{"kind":"string"}}],"precondition":null,"result":{"element":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"option"}},{"destination":null,"index":9,"internal":false,"name":"ink_m5d18bbf4cd5236cf3a3bce3bc0ef39b2ca5d48cc74c98fd149a78715c7abf0fc","parallel":false,"params":[{"name":"value","type":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}},{"name":"key","type":{"kind":"string"}}],"precondition":null,"result":{"error":{"kind":"enum","name":"ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb","variants":["ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedObject","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedArray","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedBoolean","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedNumber","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedString"]},"kind":"result","ok":{"element":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"option"}}},{"destination":null,"index":10,"internal":false,"name":"ink_md87d2855f042e634a3f3b8c068533029f73d510386d43bf00bc9d0bcd07e5c8c","parallel":false,"params":[{"name":"value","type":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"precondition":null,"result":{"error":{"kind":"enum","name":"ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb","variants":["ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedObject","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedArray","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedBoolean","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedNumber","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedString"]},"kind":"result","ok":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}},{"destination":null,"index":11,"internal":false,"name":"ink_m20157316281aa2312519e1609fa4690b136f16e4ef71773eb2a47a1fa3a406de","parallel":false,"params":[{"name":"value","type":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"precondition":null,"result":{"error":{"kind":"enum","name":"ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb","variants":["ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedObject","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedArray","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedBoolean","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedNumber","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedString"]},"kind":"result","ok":{"element":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}},{"destination":null,"index":12,"internal":false,"name":"ink_me72555cbb304777e5aa4f9e3c006554a0e08baef4b0d7d5315bbdb8d73619005","parallel":false,"params":[{"name":"value","type":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"precondition":null,"result":{"error":{"kind":"enum","name":"ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb","variants":["ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedObject","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedArray","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedBoolean","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedNumber","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedString"]},"kind":"result","ok":{"kind":"string"}}},{"destination":null,"index":13,"internal":false,"name":"ink_m0799e9661dd281b944df2c23f24248caf4bf5ffd20f6d9a7e2fe778ce1a073d2","parallel":false,"params":[{"name":"value","type":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"precondition":null,"result":{"error":{"kind":"enum","name":"ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb","variants":["ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedObject","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedArray","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedBoolean","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedNumber","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedString"]},"kind":"result","ok":{"kind":"string"}}},{"destination":null,"index":14,"internal":false,"name":"ink_m992ba36e5bbedf39b7f14a42b10f872b6c0c9a2ea93b89b3fc52f4d549687c80","parallel":false,"params":[{"name":"value","type":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"precondition":null,"result":{"error":{"kind":"enum","name":"ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb","variants":["ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedObject","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedArray","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedBoolean","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedNumber","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedString"]},"kind":"result","ok":{"kind":"bool"}}},{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":15,"internal":false,"name":"ink_md6609e67dc544a99f2a87bd888df500ffda6c2a250ac3bb96e169677f36aa0ca","parallel":false,"params":[{"name":"members","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}},{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"precondition":null,"result":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}},{"destination":null,"index":16,"internal":false,"name":"ink_mad008ef4986d9f0222e8592e1b0d53b594ed67eab0548e67ceabe4308ff8638b","parallel":false,"params":[{"name":"value","type":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}},{"name":"key","type":{"kind":"string"}},{"name":"replacement","type":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"precondition":null,"result":{"error":{"kind":"enum","name":"ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb","variants":["ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedObject","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedArray","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedBoolean","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedNumber","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedString"]},"kind":"result","ok":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}},{"destination":null,"index":17,"internal":false,"name":"ink_m6daa56a5bc5a861d85247ffa7c539a517219bed2c2c205e9798247b46093c271","parallel":false,"params":[{"name":"value","type":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}},{"name":"key","type":{"kind":"string"}}],"precondition":null,"result":{"error":{"kind":"enum","name":"ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb","variants":["ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedObject","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedArray","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedBoolean","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedNumber","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedString"]},"kind":"result","ok":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}},{"destination":null,"index":18,"internal":false,"name":"ink_m55d79925938089d1d4f5680a132089bb2dbc200f324c50670835f2f3730f3837","parallel":false,"params":[{"name":"value","type":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}},{"name":"keys","type":{"element":{"kind":"string"},"kind":"list"}}],"precondition":null,"result":{"error":{"kind":"enum","name":"ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb","variants":["ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedObject","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedArray","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedBoolean","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedNumber","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedString"]},"kind":"result","ok":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}}],"named_types":{"Row":{"fields":[{"name":"value","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"metadata","type":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"Row"},"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"},"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"kind":"ref","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"},"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"},"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"kind":"ref","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"},"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"},"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}},"schema":1,"state":{"actions":[{"change":true,"fallible":true,"freshResult":true,"index":0,"name":"put","params":[{"name":"key","type":{"kind":"string"}},{"name":"row","type":{"fields":[{"name":"value","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"metadata","type":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"Row"}},{"name":"fail","type":{"kind":"bool"}}],"precondition":null,"result":{"error":{"kind":"enum","name":"Error","variants":["Error.Failed"]},"kind":"result","ok":{"kind":"unit"}},"roots":[0],"singleCell":true},{"change":true,"fallible":true,"freshResult":true,"index":1,"name":"erase","params":[{"name":"key","type":{"kind":"string"}},{"name":"fail","type":{"kind":"bool"}}],"precondition":null,"result":{"error":{"kind":"enum","name":"Error","variants":["Error.Failed"]},"kind":"result","ok":{"kind":"unit"}},"roots":[0],"singleCell":true},{"change":false,"fallible":false,"freshResult":true,"index":2,"name":"total","params":[],"precondition":null,"result":{"kind":"u32"},"roots":[0],"singleCell":true},{"change":false,"fallible":false,"freshResult":false,"index":3,"name":"row","params":[{"name":"key","type":{"kind":"string"}}],"precondition":null,"result":{"element":{"fields":[{"name":"value","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"metadata","type":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"Row"},"kind":"option"},"roots":[0],"singleCell":true}],"events":[{"name":"seen","snapshotType":{"kind":"u32"},"type":{"kind":"u32"}}],"invariantChecks":[],"keepInvalidations":[[]],"keeps":[],"roots":[{"key":{"kind":"string"},"name":"Rows","snapshotKey":{"kind":"string"},"snapshotValue":{"fields":[{"name":"value","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"metadata","type":{"body":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"body":{"fields":[{"name":"item0","type":{"element":{"body":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record"},"kind":"bind","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record"},"kind":"bind","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"body":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record"},"kind":"bind","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record"}},"kind":"result","ok":{"fields":[],"kind":"record"}}}],"kind":"record"},"kind":"bind","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record"},"value":{"fields":[{"name":"value","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}},{"name":"metadata","type":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"Row"}}],"snapshot":{"program":[170,2,160,201,22,34,6,102,106,120,127,195,108,222,134,87,107,18,249,205,65,4,204,37,145,133,33,239,56,73,0,121],"schema":[215,31,142,65,238,22,48,236,29,237,247,185,248,201,46,30,164,196,64,247,0,243,34,135,232,15,229,166,43,18,34,88]}},"wire":{"format":"ink-value-wire-v1","functions":{"identity":{"arguments":{"format":"ink-value-wire-v1","identity":"d3d791c0090ff618145067c5c8bd7302c45c5444b41643c3d24aa8f7416bcea1","named":{"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}},"root":{"fields":[{"name":"document","type":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"cde2342294b5d22d550a478382af229c83cb7f43fc3b018dcd529ebfc8a284ba","named":{"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}},"root":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}},"ink_m0799e9661dd281b944df2c23f24248caf4bf5ffd20f6d9a7e2fe778ce1a073d2":{"arguments":{"format":"ink-value-wire-v1","identity":"999994f83a090f57c5b729be3ebc6a78ab2d71614a5942a4bafedb7df6fd1c68","named":{"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}},"root":{"fields":[{"name":"value","type":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"e24d959ababfea7ff89fb11b86077069a10d5bcee2e219f87130e9817ff587e1","named":{},"root":{"error":{"kind":"enum","name":"ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb","variants":["ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedObject","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedArray","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedBoolean","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedNumber","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedString"]},"kind":"result","ok":{"kind":"string"}}}},"ink_m20157316281aa2312519e1609fa4690b136f16e4ef71773eb2a47a1fa3a406de":{"arguments":{"format":"ink-value-wire-v1","identity":"999994f83a090f57c5b729be3ebc6a78ab2d71614a5942a4bafedb7df6fd1c68","named":{"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}},"root":{"fields":[{"name":"value","type":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"bbc92730c4d69116e391c2fb18422a1876181431d200628bd1ba3ee68c42e237","named":{"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}},"root":{"error":{"kind":"enum","name":"ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb","variants":["ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedObject","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedArray","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedBoolean","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedNumber","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedString"]},"kind":"result","ok":{"element":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}}},"ink_m2383a37c8f0f060d8454d784560b1928c68c5b404b4b5fd5bfff2e7fa4fddcbe":{"arguments":{"format":"ink-value-wire-v1","identity":"efa6cdb28c046e3dc55ebf0adece8509300aa163daf0657df94c290cde7bb29e","named":{"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}},"root":{"fields":[{"name":"members","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}},{"name":"key","type":{"kind":"string"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"fca6ee2ed4d9b81404327cbe773b519441d1d81486d2bc394fb759a7d795d6cf","named":{"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}},"root":{"element":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"option"}}},"ink_m55d79925938089d1d4f5680a132089bb2dbc200f324c50670835f2f3730f3837":{"arguments":{"format":"ink-value-wire-v1","identity":"c81bddc5f58061bca25e8a98786d225fbeacc0d14ab23e485f2ac5652914ca5d","named":{"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}},"root":{"fields":[{"name":"value","type":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}},{"name":"keys","type":{"element":{"kind":"string"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"7009644bf1bd80a4b5df84e49ccd1b83630a5a3bb97fd1654953e69fcfd52fa2","named":{"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}},"root":{"error":{"kind":"enum","name":"ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb","variants":["ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedObject","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedArray","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedBoolean","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedNumber","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedString"]},"kind":"result","ok":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}}},"ink_m5c5479101d38cd5d28f66110c880ad28b6ee3ee64fddb98300dda927c645c107":{"arguments":{"format":"ink-value-wire-v1","identity":"3720cf83cb9a672c0c70e7f80cfe0abe0bf9b7df73d40a9def0c7436234026b2","named":{},"root":{"fields":[],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"cde2342294b5d22d550a478382af229c83cb7f43fc3b018dcd529ebfc8a284ba","named":{"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}},"root":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}},"ink_m5d18bbf4cd5236cf3a3bce3bc0ef39b2ca5d48cc74c98fd149a78715c7abf0fc":{"arguments":{"format":"ink-value-wire-v1","identity":"e0fd935fe30c0a3925545388c1ee24c117fb2fa931b5ee823fe4a607393286b2","named":{"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}},"root":{"fields":[{"name":"value","type":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}},{"name":"key","type":{"kind":"string"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"26cf663a2b8c3c836b1e7a7a83e9e1cd115b0d1d1cae8bc3feca9e205abcc0ea","named":{"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}},"root":{"error":{"kind":"enum","name":"ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb","variants":["ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedObject","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedArray","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedBoolean","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedNumber","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedString"]},"kind":"result","ok":{"element":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"option"}}}},"ink_m6daa56a5bc5a861d85247ffa7c539a517219bed2c2c205e9798247b46093c271":{"arguments":{"format":"ink-value-wire-v1","identity":"e0fd935fe30c0a3925545388c1ee24c117fb2fa931b5ee823fe4a607393286b2","named":{"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}},"root":{"fields":[{"name":"value","type":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}},{"name":"key","type":{"kind":"string"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"7009644bf1bd80a4b5df84e49ccd1b83630a5a3bb97fd1654953e69fcfd52fa2","named":{"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}},"root":{"error":{"kind":"enum","name":"ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb","variants":["ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedObject","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedArray","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedBoolean","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedNumber","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedString"]},"kind":"result","ok":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}}},"ink_m992ba36e5bbedf39b7f14a42b10f872b6c0c9a2ea93b89b3fc52f4d549687c80":{"arguments":{"format":"ink-value-wire-v1","identity":"999994f83a090f57c5b729be3ebc6a78ab2d71614a5942a4bafedb7df6fd1c68","named":{"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}},"root":{"fields":[{"name":"value","type":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"85402867d4e17348f13331ff7950cadaf3a880baf9a3257dda65baae17bc3dc6","named":{},"root":{"error":{"kind":"enum","name":"ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb","variants":["ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedObject","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedArray","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedBoolean","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedNumber","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedString"]},"kind":"result","ok":{"kind":"bool"}}}},"ink_mad008ef4986d9f0222e8592e1b0d53b594ed67eab0548e67ceabe4308ff8638b":{"arguments":{"format":"ink-value-wire-v1","identity":"84b998083d21e20e00637080143e299c47336742266a8fcb8252e322c986b306","named":{"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}},"root":{"fields":[{"name":"value","type":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}},{"name":"key","type":{"kind":"string"}},{"name":"replacement","type":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"7009644bf1bd80a4b5df84e49ccd1b83630a5a3bb97fd1654953e69fcfd52fa2","named":{"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}},"root":{"error":{"kind":"enum","name":"ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb","variants":["ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedObject","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedArray","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedBoolean","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedNumber","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedString"]},"kind":"result","ok":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}}},"ink_mb0e8aa1d34f7cc5fc940000b63bdc043068202b64206a7da02cade0c4e386a22":{"arguments":{"format":"ink-value-wire-v1","identity":"bbb379e277d6b460a0f9b8674480d674413e01f92d0409f754ac0b7fb228c9ed","named":{"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}},"root":{"fields":[{"name":"members","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"cde2342294b5d22d550a478382af229c83cb7f43fc3b018dcd529ebfc8a284ba","named":{"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}},"root":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}},"ink_mbf312e22e5ab893385ef1935f8250f16e090d4da8dd41bc1577df1ba636fdc13":{"arguments":{"format":"ink-value-wire-v1","identity":"6b3d0195ef2c386b261eec6dcf7ff025126e09d574445703806ad22aeb1c44a6","named":{},"root":{"fields":[{"name":"value","type":{"kind":"bool"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"cde2342294b5d22d550a478382af229c83cb7f43fc3b018dcd529ebfc8a284ba","named":{"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}},"root":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}},"ink_mca67a4ea249e8eba3cf6e453e86dd061695d9d9afaf7edcf587f8cd1cbc055c9":{"arguments":{"format":"ink-value-wire-v1","identity":"9cfa9fda5c8479d6a1f3dcbd84badb6f4c8c44593fa7472b40f9732abe82eec3","named":{},"root":{"fields":[{"name":"value","type":{"kind":"string"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"cde2342294b5d22d550a478382af229c83cb7f43fc3b018dcd529ebfc8a284ba","named":{"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}},"root":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}},"ink_md6609e67dc544a99f2a87bd888df500ffda6c2a250ac3bb96e169677f36aa0ca":{"arguments":{"format":"ink-value-wire-v1","identity":"3d53a49fdbf9c1f06dae4677eb6ee89a8d118b8b47f44d5774e2129be34d7063","named":{"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}},"root":{"fields":[{"name":"members","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}},{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"2b5b92cf8b137fa488f335d974dfd980de30e6aa85fefd6ad847da102cf7cb93","named":{"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}},"root":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}},"ink_md87d2855f042e634a3f3b8c068533029f73d510386d43bf00bc9d0bcd07e5c8c":{"arguments":{"format":"ink-value-wire-v1","identity":"999994f83a090f57c5b729be3ebc6a78ab2d71614a5942a4bafedb7df6fd1c68","named":{"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}},"root":{"fields":[{"name":"value","type":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"31c4fe41eb6c3b7dcfc985f701b759a14acb5d2bfa5f13ee2bc29d20c5baa6ac","named":{"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}},"root":{"error":{"kind":"enum","name":"ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb","variants":["ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedObject","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedArray","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedBoolean","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedNumber","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedString"]},"kind":"result","ok":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}}},"ink_me5c9745ee2d98ddc2c32843ec24ea225963aff43ce357055dd9a61b18d1d4982":{"arguments":{"format":"ink-value-wire-v1","identity":"799b4490fb0a0ca59d1db14f2c2d32908b1bc537830d3fea3f14e37370464360","named":{"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}},"root":{"fields":[{"name":"values","type":{"element":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"cde2342294b5d22d550a478382af229c83cb7f43fc3b018dcd529ebfc8a284ba","named":{"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}},"root":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}},"ink_me72555cbb304777e5aa4f9e3c006554a0e08baef4b0d7d5315bbdb8d73619005":{"arguments":{"format":"ink-value-wire-v1","identity":"999994f83a090f57c5b729be3ebc6a78ab2d71614a5942a4bafedb7df6fd1c68","named":{"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}},"root":{"fields":[{"name":"value","type":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"e24d959ababfea7ff89fb11b86077069a10d5bcee2e219f87130e9817ff587e1","named":{},"root":{"error":{"kind":"enum","name":"ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb","variants":["ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedObject","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedArray","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedBoolean","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedNumber","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedString"]},"kind":"result","ok":{"kind":"string"}}}},"ink_mee36d9721e4db57ba82a41d18344d03b18dc98a5d22319238b436d9aa6c8a6c1":{"arguments":{"format":"ink-value-wire-v1","identity":"9e5a22adedd7402800f200b09bf661e677194b9d568e7b4b5be4331d15388662","named":{},"root":{"fields":[{"name":"token","type":{"kind":"string"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"cde2342294b5d22d550a478382af229c83cb7f43fc3b018dcd529ebfc8a284ba","named":{"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}},"root":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}},"set_document":{"arguments":{"format":"ink-value-wire-v1","identity":"27aee69f3c0a91c6ea7c31334f9be952533862738e8114c60aa8eda0eeb66bb4","named":{"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}},"root":{"fields":[{"name":"document","type":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}},{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"arguments"}},"result":{"format":"ink-value-wire-v1","identity":"7009644bf1bd80a4b5df84e49ccd1b83630a5a3bb97fd1654953e69fcfd52fa2","named":{"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}},"root":{"error":{"kind":"enum","name":"ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb","variants":["ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedObject","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedArray","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedBoolean","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedNumber","ink_ma6ccc711a182f5a2575b68a1630ea86a855fb78b15dea9e6d788c583eee3a4eb.ExpectedString"]},"kind":"result","ok":{"fields":[{"name":"payload","type":{"error":{"error":{"error":{"error":{"error":{"fields":[{"name":"item0","type":{"element":{"fields":[{"name":"key","type":{"kind":"string"}},{"name":"value","type":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}],"kind":"record","name":"ink_m823309142b2685b3a65d1c240843dcfed7c1e6a964f2bd941ba741adb1a384ce"},"kind":"list"}}],"kind":"record","name":"__ink_payload_78bdb60e43bbf3d610e8c872cdcf4babee88d930550a58c7f150b03b655eda19"},"kind":"result","ok":{"fields":[{"name":"item0","type":{"element":{"kind":"ref","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"},"kind":"list"}}],"kind":"record","name":"__ink_payload_dcbf99b07cb62cbb8182f115cec1fac21e0a41bfd60fa5f2457127913327b1c8"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_34632bbd9a8f7a60bed4b0ed3a45d7a5adfc2900c7a8d37f4469b76a609fa5e2"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"string"}}],"kind":"record","name":"__ink_payload_a82bf7eb015d981339eb3e20eeff3358ebb91e9aa8e78dab18648569bd18706e"}},"kind":"result","ok":{"fields":[{"name":"item0","type":{"kind":"bool"}}],"kind":"record","name":"__ink_payload_bff999f8a2a326529afcad49253e4e2a1fd440bbdd336be755288693fe5957e7"}},"kind":"result","ok":{"fields":[],"kind":"record","name":"__ink_payload_dd3f88ecb1e96c7ceee99cebd542718942d6e2ff44637670e6aa06aeb54b2550"}}}],"kind":"record","name":"ink_mb8980dfd2092455f08e830a4f6c2980fe2b118f1f2b6966e921b3afccfceb634"}}}}}}};
const __implementations=[__fn0,__fn1,__fn2,__fn3,__fn4,__fn5,__fn6,__fn7,__fn8,__fn9,__fn10,__fn11,__fn12,__fn13,__fn14,__fn15,__fn16,__fn17,__fn18];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>[f.name,__implementations[f.index]])));
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
 frame(emit){if(this.#depth>this.#depthLimit||--this.#remaining<0)throw Error('wire node or depth limit');const at=this.position;this.word(0);this.#depth++;try{emit(this);}finally{this.#depth--;}this.patchWord(at,this.position-at-4);}
 reorder(start,spans){
  const sorted=spans.slice().sort((a,b)=>a[0]-b[0]);let at=start;
  for(const [a,b] of sorted){if(!Number.isInteger(a)||!Number.isInteger(b)||a!==at||b<a)throw Error('wire span permutation');at=b;}
  if(start<0||start>this.#at||at!==this.#at)throw Error('wire span permutation');
  if(spans.every((s,i)=>s===sorted[i]))return;
  const copy=this.#data.slice(start,this.#at);at=start;for(const [a,b] of spans){this.#data.set(copy.subarray(a-start,b-start),at);at+=b-a;}
 }
 finish(){return this.#data.slice(0,this.#at);}
}

class CompactWireEncoder extends WireEncoder{
 beginNode(){return 0;}
 endNode(){}
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
function jsonUtf8Length(text){if(text.length>16&&!/[^\x00-\x7f]/.test(text))return text.length;let bytes=0;for(let i=0;i<text.length;i++){const c=text.charCodeAt(i);if(c<128)bytes++;else if(c<2048)bytes+=2;else if(c>=0xd800&&c<=0xdbff){bytes+=4;i++;}else bytes+=3;}return bytes;}
const jsonLimits={bytes:16777216,nodes:1000000,depth:128};
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
 stringify(value,options={}){return stringifyJsonValue(value,options,jsonBoundaryBudget(options));}
 parseBinary(text,options={}){return streamJsonBinary(this.values,text,options,false);}
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
function streamJsonBinary(values,text,options,typed){
 const p=new JsonWireReader(text,options),utf8=jsonWireEncoder;
 const list=(w,open,close,item)=>{if(!p.eat(open))throw Error('JSON container shape');const at=w.position;w.word(0);let count=0;if(!p.eat(close))while(true){item(w);count++;if(p.eat(close))break;if(!p.eat(','))throw Error('JSON container separator');}w.patchWord(at,count);};
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
function __ownedValue23(value,budget,depth){budget.enter(depth,8);const n=value.length;if(n>budget.remaining)throw Error('wire sequence size');const out=new Array(n);for(let i=0;i<n;i++)out[i]=__ownedValue24(value[i],budget,depth+1);return out;}
function __ownedValue17(value,budget,depth){budget.enter(depth,8);const n=value.length;if(n>budget.remaining)throw Error('wire sequence size');const out=new Array(n);for(let i=0;i<n;i++)out[i]=__ownedValue18(value[i],budget,depth+1);return out;}
function __ownedValue35(value,budget,depth){budget.enter(depth,8);const n=value.length;if(n>budget.remaining)throw Error('wire sequence size');const out=new Array(n);for(let i=0;i<n;i++)out[i]=__ownedValue1(value[i],budget,depth+1);return out;}
function __ownedValue20(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'None')&&value.None===null?{None:null}:{Some:__ownedValue1(value.Some,budget,depth+1)};}
function __ownedValue32(value,budget,depth){budget.enter(depth,8);const n=value.length;if(n>budget.remaining)throw Error('wire sequence size');const out=new Array(n);for(let i=0;i<n;i++)out[i]=__ownedValue33(value[i],budget,depth+1);return out;}
function __ownedValue14(value,budget,depth){budget.enter(depth,8);const n=value.length;if(n>budget.remaining)throw Error('wire sequence size');const out=new Array(n);for(let i=0;i<n;i++)out[i]=__ownedValue15(value[i],budget,depth+1);return out;}
function __ownedValue2(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__ownedValue3(value.Ok,budget,depth+1)}:{Err:__ownedValue4(value.Err,budget,depth+1)};}
function __ownedValue26(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__ownedValue3(value.Ok,budget,depth+1)}:{Err:__ownedValue27(value.Err,budget,depth+1)};}
function __ownedValue4(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__ownedValue5(value.Ok,budget,depth+1)}:{Err:__ownedValue7(value.Err,budget,depth+1)};}
function __ownedValue27(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__ownedValue5(value.Ok,budget,depth+1)}:{Err:__ownedValue28(value.Err,budget,depth+1)};}
function __ownedValue7(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__ownedValue8(value.Ok,budget,depth+1)}:{Err:__ownedValue10(value.Err,budget,depth+1)};}
function __ownedValue28(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__ownedValue8(value.Ok,budget,depth+1)}:{Err:__ownedValue29(value.Err,budget,depth+1)};}
function __ownedValue10(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__ownedValue11(value.Ok,budget,depth+1)}:{Err:__ownedValue12(value.Err,budget,depth+1)};}
function __ownedValue29(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__ownedValue11(value.Ok,budget,depth+1)}:{Err:__ownedValue30(value.Err,budget,depth+1)};}
function __ownedValue12(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__ownedValue13(value.Ok,budget,depth+1)}:{Err:__ownedValue16(value.Err,budget,depth+1)};}
function __ownedValue30(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__ownedValue13(value.Ok,budget,depth+1)}:{Err:__ownedValue31(value.Err,budget,depth+1)};}
function __ownedValue22(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__ownedValue23(value.Ok,budget,depth+1)}:{Err:__ownedValue19(value.Err,budget,depth+1)};}
function __ownedValue34(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__ownedValue35(value.Ok,budget,depth+1)}:{Err:__ownedValue19(value.Err,budget,depth+1)};}
function __ownedValue21(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__ownedValue20(value.Ok,budget,depth+1)}:{Err:__ownedValue19(value.Err,budget,depth+1)};}
function __ownedValue0(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__ownedValue1(value.Ok,budget,depth+1)}:{Err:__ownedValue19(value.Err,budget,depth+1)};}
function __ownedValue37(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__ownedValue6(value.Ok,budget,depth+1)}:{Err:__ownedValue19(value.Err,budget,depth+1)};}
function __ownedValue36(value,budget,depth){budget.enter(depth,5);return Object.hasOwn(value,'Ok')?{Ok:__ownedValue9(value.Ok,budget,depth+1)}:{Err:__ownedValue19(value.Err,budget,depth+1)};}
function __ownedValue3(value,budget,depth){budget.enter(depth,4);return {};}
function __ownedValue16(value,budget,depth){budget.enter(depth,4);return {["item0"]:__ownedValue17(value["item0"],budget,depth+1)};}
function __ownedValue31(value,budget,depth){budget.enter(depth,4);return {["item0"]:__ownedValue32(value["item0"],budget,depth+1)};}
function __ownedValue13(value,budget,depth){budget.enter(depth,4);return {["item0"]:__ownedValue14(value["item0"],budget,depth+1)};}
function __ownedValue5(value,budget,depth){budget.enter(depth,4);return {["item0"]:__ownedValue6(value["item0"],budget,depth+1)};}
function __ownedValue11(value,budget,depth){budget.enter(depth,4);return {["item0"]:__ownedValue9(value["item0"],budget,depth+1)};}
function __ownedValue8(value,budget,depth){budget.enter(depth,4);return {["item0"]:__ownedValue9(value["item0"],budget,depth+1)};}
function __ownedValue24(value,budget,depth){budget.enter(depth,4);return {["key"]:__ownedValue9(value["key"],budget,depth+1),["value"]:__ownedValue25(value["value"],budget,depth+1)};}
function __ownedValue18(value,budget,depth){budget.enter(depth,4);return {["key"]:__ownedValue9(value["key"],budget,depth+1),["value"]:__ownedValue15(value["value"],budget,depth+1)};}
function __ownedValue1(value,budget,depth){budget.enter(depth,4);return {["payload"]:__ownedValue2(value["payload"],budget,depth+1)};}
function __ownedValue25(value,budget,depth){budget.enter(depth,4);return {["payload"]:__ownedValue26(value["payload"],budget,depth+1)};}
function __ownedValue6(value,budget,depth){budget.enter(depth,5);return value;}
function __ownedValue19(value,budget,depth){budget.enter(depth,4);budget.text(value);return value;}
function __ownedValue33(value,budget,depth){return __ownedValue24(value,budget,depth);}
function __ownedValue15(value,budget,depth){return __ownedValue1(value,budget,depth);}
function __ownedValue9(value,budget,depth){budget.enter(depth,4);budget.text(value);return value;}
const __ownedFunctions=Object.freeze(Object.fromEntries([["set_document",__ownedValue0],["identity",__ownedValue1],["ink_m5c5479101d38cd5d28f66110c880ad28b6ee3ee64fddb98300dda927c645c107",__ownedValue1],["ink_mbf312e22e5ab893385ef1935f8250f16e090d4da8dd41bc1577df1ba636fdc13",__ownedValue1],["ink_mee36d9721e4db57ba82a41d18344d03b18dc98a5d22319238b436d9aa6c8a6c1",__ownedValue1],["ink_mca67a4ea249e8eba3cf6e453e86dd061695d9d9afaf7edcf587f8cd1cbc055c9",__ownedValue1],["ink_me5c9745ee2d98ddc2c32843ec24ea225963aff43ce357055dd9a61b18d1d4982",__ownedValue1],["ink_mb0e8aa1d34f7cc5fc940000b63bdc043068202b64206a7da02cade0c4e386a22",__ownedValue1],["ink_m2383a37c8f0f060d8454d784560b1928c68c5b404b4b5fd5bfff2e7fa4fddcbe",__ownedValue20],["ink_m5d18bbf4cd5236cf3a3bce3bc0ef39b2ca5d48cc74c98fd149a78715c7abf0fc",__ownedValue21],["ink_md87d2855f042e634a3f3b8c068533029f73d510386d43bf00bc9d0bcd07e5c8c",__ownedValue22],["ink_m20157316281aa2312519e1609fa4690b136f16e4ef71773eb2a47a1fa3a406de",__ownedValue34],["ink_me72555cbb304777e5aa4f9e3c006554a0e08baef4b0d7d5315bbdb8d73619005",__ownedValue36],["ink_m0799e9661dd281b944df2c23f24248caf4bf5ffd20f6d9a7e2fe778ce1a073d2",__ownedValue36],["ink_m992ba36e5bbedf39b7f14a42b10f872b6c0c9a2ea93b89b3fc52f4d549687c80",__ownedValue37],["ink_md6609e67dc544a99f2a87bd888df500ffda6c2a250ac3bb96e169677f36aa0ca",__ownedValue23],["ink_mad008ef4986d9f0222e8592e1b0d53b594ed67eab0548e67ceabe4308ff8638b",__ownedValue0],["ink_m6daa56a5bc5a861d85247ffa7c539a517219bed2c2c205e9798247b46093c271",__ownedValue0],["ink_m55d79925938089d1d4f5680a132089bb2dbc200f324c50670835f2f3730f3837",__ownedValue0]]));
function __wireValue24(reader){const end=reader.frame();const n=reader.count(),value=new Array(n);for(let i=0;i<n;i++)value[i]=__wireValue25(reader);reader.finish(end);return value;}
function __wireValue16(reader){const end=reader.frame();const n=reader.count(),value=new Array(n);for(let i=0;i<n;i++)value[i]=__wireValue17(reader);reader.finish(end);return value;}
function __wireValue22(reader){const end=reader.frame();const n=reader.count(),value=new Array(n);for(let i=0;i<n;i++)value[i]=__wireValue1(reader);reader.finish(end);return value;}
function __wireValue34(reader){const end=reader.frame();const value=reader.byte()?{Some:__wireValue1(reader)}:{None:null};reader.finish(end);return value;}
function __wireValue33(reader){const end=reader.frame();const n=reader.count(),value=new Array(n);for(let i=0;i<n;i++)value[i]=__wireValue25(reader);reader.finish(end);return value;}
function __wireValue14(reader){const end=reader.frame();const n=reader.count(),value=new Array(n);for(let i=0;i<n;i++)value[i]=__wireValue1(reader);reader.finish(end);return value;}
function __wireValue36(reader){const end=reader.frame();const n=reader.count(),value=new Array(n);for(let i=0;i<n;i++)value[i]=__wireValue9(reader);reader.finish(end);return value;}
function __wireValue2(reader){const end=reader.frame();const value=reader.byte()?{Err:__wireValue4(reader)}:{Ok:__wireValue3(reader)};reader.finish(end);return value;}
function __wireValue27(reader){const end=reader.frame();const value=reader.byte()?{Err:__wireValue28(reader)}:{Ok:__wireValue3(reader)};reader.finish(end);return value;}
function __wireValue4(reader){const end=reader.frame();const value=reader.byte()?{Err:__wireValue7(reader)}:{Ok:__wireValue5(reader)};reader.finish(end);return value;}
function __wireValue28(reader){const end=reader.frame();const value=reader.byte()?{Err:__wireValue29(reader)}:{Ok:__wireValue5(reader)};reader.finish(end);return value;}
function __wireValue7(reader){const end=reader.frame();const value=reader.byte()?{Err:__wireValue10(reader)}:{Ok:__wireValue8(reader)};reader.finish(end);return value;}
function __wireValue29(reader){const end=reader.frame();const value=reader.byte()?{Err:__wireValue30(reader)}:{Ok:__wireValue8(reader)};reader.finish(end);return value;}
function __wireValue10(reader){const end=reader.frame();const value=reader.byte()?{Err:__wireValue12(reader)}:{Ok:__wireValue11(reader)};reader.finish(end);return value;}
function __wireValue30(reader){const end=reader.frame();const value=reader.byte()?{Err:__wireValue31(reader)}:{Ok:__wireValue11(reader)};reader.finish(end);return value;}
function __wireValue12(reader){const end=reader.frame();const value=reader.byte()?{Err:__wireValue15(reader)}:{Ok:__wireValue13(reader)};reader.finish(end);return value;}
function __wireValue31(reader){const end=reader.frame();const value=reader.byte()?{Err:__wireValue32(reader)}:{Ok:__wireValue13(reader)};reader.finish(end);return value;}
function __wireValue47(reader){const end=reader.frame();const value=reader.byte()?{Err:__wireValue20(reader)}:{Ok:__wireValue24(reader)};reader.finish(end);return value;}
function __wireValue21(reader){const end=reader.frame();const value=reader.byte()?{Err:__wireValue20(reader)}:{Ok:__wireValue22(reader)};reader.finish(end);return value;}
function __wireValue40(reader){const end=reader.frame();const value=reader.byte()?{Err:__wireValue20(reader)}:{Ok:__wireValue34(reader)};reader.finish(end);return value;}
function __wireValue37(reader){const end=reader.frame();const value=reader.byte()?{Err:__wireValue20(reader)}:{Ok:__wireValue1(reader)};reader.finish(end);return value;}
function __wireValue41(reader){const end=reader.frame();const value=reader.byte()?{Err:__wireValue20(reader)}:{Ok:__wireValue6(reader)};reader.finish(end);return value;}
function __wireValue19(reader){const end=reader.frame();const value=reader.byte()?{Err:__wireValue20(reader)}:{Ok:__wireValue9(reader)};reader.finish(end);return value;}
function __wireValue3(reader){const end=reader.frame();const value={};reader.finish(end);return value;}
function __wireValue38(reader){const end=reader.frame();const value={};reader.finish(end);return value;}
function __wireValue50(reader){const end=reader.frame();const value={["document"]:__wireValue1(reader),["key"]:__wireValue9(reader),["value"]:__wireValue1(reader)};reader.finish(end);return value;}
function __wireValue0(reader){const end=reader.frame();const value={["document"]:__wireValue1(reader)};reader.finish(end);return value;}
function __wireValue15(reader){const end=reader.frame();const value={["item0"]:__wireValue16(reader)};reader.finish(end);return value;}
function __wireValue32(reader){const end=reader.frame();const value={["item0"]:__wireValue33(reader)};reader.finish(end);return value;}
function __wireValue13(reader){const end=reader.frame();const value={["item0"]:__wireValue14(reader)};reader.finish(end);return value;}
function __wireValue5(reader){const end=reader.frame();const value={["item0"]:__wireValue6(reader)};reader.finish(end);return value;}
function __wireValue11(reader){const end=reader.frame();const value={["item0"]:__wireValue9(reader)};reader.finish(end);return value;}
function __wireValue8(reader){const end=reader.frame();const value={["item0"]:__wireValue9(reader)};reader.finish(end);return value;}
function __wireValue25(reader){const end=reader.frame();const value={["key"]:__wireValue9(reader),["value"]:__wireValue26(reader)};reader.finish(end);return value;}
function __wireValue17(reader){const end=reader.frame();const value={["key"]:__wireValue9(reader),["value"]:__wireValue1(reader)};reader.finish(end);return value;}
function __wireValue46(reader){const end=reader.frame();const value={["members"]:__wireValue24(reader),["key"]:__wireValue9(reader),["value"]:__wireValue1(reader)};reader.finish(end);return value;}
function __wireValue23(reader){const end=reader.frame();const value={["members"]:__wireValue24(reader),["key"]:__wireValue9(reader)};reader.finish(end);return value;}
function __wireValue43(reader){const end=reader.frame();const value={["members"]:__wireValue24(reader)};reader.finish(end);return value;}
function __wireValue1(reader){const end=reader.frame();const value={["payload"]:__wireValue2(reader)};reader.finish(end);return value;}
function __wireValue26(reader){const end=reader.frame();const value={["payload"]:__wireValue27(reader)};reader.finish(end);return value;}
function __wireValue49(reader){const end=reader.frame();const value={["token"]:__wireValue9(reader)};reader.finish(end);return value;}
function __wireValue42(reader){const end=reader.frame();const value={["value"]:__wireValue1(reader),["key"]:__wireValue9(reader),["replacement"]:__wireValue1(reader)};reader.finish(end);return value;}
function __wireValue39(reader){const end=reader.frame();const value={["value"]:__wireValue1(reader),["key"]:__wireValue9(reader)};reader.finish(end);return value;}
function __wireValue35(reader){const end=reader.frame();const value={["value"]:__wireValue1(reader),["keys"]:__wireValue36(reader)};reader.finish(end);return value;}
function __wireValue18(reader){const end=reader.frame();const value={["value"]:__wireValue1(reader)};reader.finish(end);return value;}
function __wireValue44(reader){const end=reader.frame();const value={["value"]:__wireValue6(reader)};reader.finish(end);return value;}
function __wireValue45(reader){const end=reader.frame();const value={["value"]:__wireValue9(reader)};reader.finish(end);return value;}
function __wireValue48(reader){const end=reader.frame();const value={["values"]:__wireValue22(reader)};reader.finish(end);return value;}
function __wireValue6(reader){const end=reader.frame();const value=!!reader.byte();reader.finish(end);return value;}
function __wireValue20(reader){const end=reader.frame();const value=reader.text(end);reader.finish(end);return value;}
function __wireValue9(reader){const end=reader.frame();const value=reader.text(end);reader.finish(end);return value;}
const __wireReaders=Object.freeze(Object.fromEntries([["identity",[__wireValue0,__wireValue1]],["ink_m0799e9661dd281b944df2c23f24248caf4bf5ffd20f6d9a7e2fe778ce1a073d2",[__wireValue18,__wireValue19]],["ink_m20157316281aa2312519e1609fa4690b136f16e4ef71773eb2a47a1fa3a406de",[__wireValue18,__wireValue21]],["ink_m2383a37c8f0f060d8454d784560b1928c68c5b404b4b5fd5bfff2e7fa4fddcbe",[__wireValue23,__wireValue34]],["ink_m55d79925938089d1d4f5680a132089bb2dbc200f324c50670835f2f3730f3837",[__wireValue35,__wireValue37]],["ink_m5c5479101d38cd5d28f66110c880ad28b6ee3ee64fddb98300dda927c645c107",[__wireValue38,__wireValue1]],["ink_m5d18bbf4cd5236cf3a3bce3bc0ef39b2ca5d48cc74c98fd149a78715c7abf0fc",[__wireValue39,__wireValue40]],["ink_m6daa56a5bc5a861d85247ffa7c539a517219bed2c2c205e9798247b46093c271",[__wireValue39,__wireValue37]],["ink_m992ba36e5bbedf39b7f14a42b10f872b6c0c9a2ea93b89b3fc52f4d549687c80",[__wireValue18,__wireValue41]],["ink_mad008ef4986d9f0222e8592e1b0d53b594ed67eab0548e67ceabe4308ff8638b",[__wireValue42,__wireValue37]],["ink_mb0e8aa1d34f7cc5fc940000b63bdc043068202b64206a7da02cade0c4e386a22",[__wireValue43,__wireValue1]],["ink_mbf312e22e5ab893385ef1935f8250f16e090d4da8dd41bc1577df1ba636fdc13",[__wireValue44,__wireValue1]],["ink_mca67a4ea249e8eba3cf6e453e86dd061695d9d9afaf7edcf587f8cd1cbc055c9",[__wireValue45,__wireValue1]],["ink_md6609e67dc544a99f2a87bd888df500ffda6c2a250ac3bb96e169677f36aa0ca",[__wireValue46,__wireValue24]],["ink_md87d2855f042e634a3f3b8c068533029f73d510386d43bf00bc9d0bcd07e5c8c",[__wireValue18,__wireValue47]],["ink_me5c9745ee2d98ddc2c32843ec24ea225963aff43ce357055dd9a61b18d1d4982",[__wireValue48,__wireValue1]],["ink_me72555cbb304777e5aa4f9e3c006554a0e08baef4b0d7d5315bbdb8d73619005",[__wireValue18,__wireValue19]],["ink_mee36d9721e4db57ba82a41d18344d03b18dc98a5d22319238b436d9aa6c8a6c1",[__wireValue49,__wireValue1]],["set_document",[__wireValue50,__wireValue37]]]));

export const valueCodecs=(()=>{const codecs={};for(const [name,s] of Object.entries(metadata.wire.functions)){if(s.unsupported)continue;let value;Object.defineProperty(codecs,name,{enumerable:true,get:()=>value??=(Object.freeze(Object.hasOwn(__wireReaders,name)?{arguments:createCompiledValueCodec(s.arguments,__wireReaders[name][0]),result:createCompiledValueCodec(s.result,__wireReaders[name][1])}:{arguments:new ValueCodec(s.arguments),result:new ValueCodec(s.result)}))});}return Object.freeze(codecs);})();
function __callEncoded(name,bytes,limits,compact){
 const f=metadata.functions.find(f=>f.name===name&&!f.internal),codecs=valueCodecs[name];
 if(!f||!codecs)throw Error('unsupported binary function');
 const input=compact?codecs.arguments.compact():codecs.arguments,output=compact?codecs.result.compact():codecs.result;
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
 const result=call(name,args);return __ownedFunctions[name](result,createValueCaptureBudget(limits),0);
}
const __intoImplementations=[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,__into15,null,null,null];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>[f.name,__intoImplementations[f.index]])));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}
