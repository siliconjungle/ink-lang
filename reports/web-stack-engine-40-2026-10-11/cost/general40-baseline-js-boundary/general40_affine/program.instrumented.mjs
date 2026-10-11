
const __ink_work_d6f9cbeeefb873f3_sites=[{"id":0,"kind":"construction","start":71,"end":84,"offset_unit":"UTF16","source_sha256":"ff384c108acfaa7bca572e56e861d8ad1ed407f05d6c13fdedf3b681791c82a1","constructor_capacity_only":false},{"id":1,"kind":"loop_iterations","start":86,"end":240,"offset_unit":"UTF16","source_sha256":"c72b7ebe2dc540b308e055089ba43ac548fee5485f57a41e51dcbdc2d46d9551"},{"id":2,"kind":"loop_iterations","start":329,"end":497,"offset_unit":"UTF16","source_sha256":"4edcb376e892253a45dfbfde6fb1316b7977b08b2a2ef92a4b8c06bffe2ea373"},{"id":3,"kind":"allocation_events","start":1697,"end":1732,"offset_unit":"UTF16","source_sha256":"29406b21bd722caad7684d4202e031ae81a33a12d6234bc86426d7985f9723f6"},{"id":4,"kind":"allocation_events","start":1978,"end":2017,"offset_unit":"UTF16","source_sha256":"82600c1be2f20d87ea10b1c5dcd3ad845f1079a51afeff65da8fafc9156a30b8"}];
let __ink_work_d6f9cbeeefb873f3_counts=[],__ink_work_d6f9cbeeefb873f3_unknown=[];
function __ink_work_d6f9cbeeefb873f3_hit(i){__ink_work_d6f9cbeeefb873f3_counts[i]=(__ink_work_d6f9cbeeefb873f3_counts[i]??0)+1;}
function __ink_work_d6f9cbeeefb873f3_allocate(i,x){__ink_work_d6f9cbeeefb873f3_hit(i);return x;}
function __ink_work_d6f9cbeeefb873f3_construct(i,x){if(Array.isArray(x)||ArrayBuffer.isView(x)||x instanceof ArrayBuffer){__ink_work_d6f9cbeeefb873f3_hit(i);if(ArrayBuffer.isView(x)&&!__ink_work_d6f9cbeeefb873f3_sites[i].constructor_capacity_only)__ink_work_d6f9cbeeefb873f3_unknown.push({site:i,components:['copy_bytes'],reason:'typed constructor ingress/copy extent not captured'});}else __ink_work_d6f9cbeeefb873f3_unknown.push({site:i,components:['allocation_events'],reason:'constructor allocation behavior unknown'});return x;}
function __ink_work_d6f9cbeeefb873f3_invoke(i,name,receiver,method,args){
 // Invoke the original native operation once. A diagnostic callback records
 // actual visits (including sparse-array skipped entries), preserving original
 // this/arguments and exception order. Opaque custom methods are left alone.
 const proto=Object.getPrototypeOf(receiver);
 const standard=Array.isArray(receiver)?proto===Array.prototype&&method===Array.prototype[name]:(ArrayBuffer.isView(receiver)&&typeof receiver.BYTES_PER_ELEMENT==='number'?method===Object.getPrototypeOf(Uint8Array.prototype)[name]:receiver instanceof ArrayBuffer&&method===ArrayBuffer.prototype[name]);
 if(standard&&(name==='map'||name==='filter')&&typeof args[0]==='function'){const callback=args[0];args[0]=function(...values){__ink_work_d6f9cbeeefb873f3_hit(__ink_work_d6f9cbeeefb873f3_sites[i].callback_site);return Reflect.apply(callback,this,values);};}
 const value=Reflect.apply(method,receiver,args);
 if(!standard){__ink_work_d6f9cbeeefb873f3_unknown.push({site:i,components:['allocation_events','copy_bytes','loop_iterations'],reason:'copy method implementation/carrier unknown'});return value;}
 if(name==='concat')__ink_work_d6f9cbeeefb873f3_unknown.push({site:i,components:['copy_bytes'],reason:'native concat carrier copy bytes unknown'});
 if(name==='set'){
  if(ArrayBuffer.isView(receiver)&&ArrayBuffer.isView(args[0])&&receiver.BYTES_PER_ELEMENT===args[0].BYTES_PER_ELEMENT)__ink_work_d6f9cbeeefb873f3_copy_bytes+=args[0].byteLength;
  else __ink_work_d6f9cbeeefb873f3_unknown.push({site:i,components:['copy_bytes'],reason:'set byte extent or conversion unknown'});
 }else if(Array.isArray(value)||ArrayBuffer.isView(value)||value instanceof ArrayBuffer){
  __ink_work_d6f9cbeeefb873f3_hit(i);
  if(name==='slice'&&(ArrayBuffer.isView(value)||value instanceof ArrayBuffer))__ink_work_d6f9cbeeefb873f3_copy_bytes+=value.byteLength;
  else if(name==='slice')__ink_work_d6f9cbeeefb873f3_unknown.push({site:i,components:['copy_bytes'],reason:'JS Array copy bytes/physical storage unknown'});
 }
 return value;
}
let __ink_work_d6f9cbeeefb873f3_copy_bytes=0;
export function __ink_work_d6f9cbeeefb873f3_reset(){__ink_work_d6f9cbeeefb873f3_counts=[];__ink_work_d6f9cbeeefb873f3_unknown=[];__ink_work_d6f9cbeeefb873f3_copy_bytes=0;}
export function __ink_work_d6f9cbeeefb873f3_snapshot(){return {sites:__ink_work_d6f9cbeeefb873f3_counts.slice(),copy_bytes:__ink_work_d6f9cbeeefb873f3_copy_bytes,unknown:__ink_work_d6f9cbeeefb873f3_unknown.slice()};}
function __fn0(v0,v1,v2,v3){
const v4=v0;
const v5=v4.length;
const v6=__ink_work_d6f9cbeeefb873f3_construct(0,new Array(v5));
for(let v7=0;v7<v5;v7++){__ink_work_d6f9cbeeefb873f3_hit(1);
const v8=v4[v7];
const v9=v8;
const v10=v3;
const v11=(Math.imul(v9,v10) >>> 0);
const v12=v2;
v6[v7]=(((v11) + (v12)) >>> 0);
}
return v6;}
function __into0(v13,v14,v15,v16,v17){
const v18=v13;
const v19=v18.length;
for(let v21=0;v21<v19;v21++){__ink_work_d6f9cbeeefb873f3_hit(2);
const v22=v18[v21];
const v23=v22;
const v24=v16;
const v25=(Math.imul(v23,v24) >>> 0);
const v26=v15;
v17[v21]=(((v25) + (v26)) >>> 0);
}
return v19;}
const __namedTypes={};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v1","core_sha256":"816f2264c285d9699fd0b414a70608f03aff7c45e879087bdcfc2be1255119e3","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":0,"internal":false,"name":"general40_affine","params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"element":{"kind":"u32"},"kind":"list"}}],"named_types":{},"schema":1,"state":null};
const __implementations=[__fn0];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>__ink_work_d6f9cbeeefb873f3_allocate(3,[f.name,__implementations[f.index]]))));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[__into0];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>__ink_work_d6f9cbeeefb873f3_allocate(4,[f.name,__intoImplementations[f.index]]))));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}
