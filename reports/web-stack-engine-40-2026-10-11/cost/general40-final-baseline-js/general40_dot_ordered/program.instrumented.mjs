
const __ink_work_8866efdb1c1b8d81_sites=[{"id":0,"kind":"construction","start":104,"end":117,"offset_unit":"UTF16","source_sha256":"07ac90ff6d58ee36cb8bc58fffc3f46e2af1df1aa84ad2f18b57e2625dbb8732","constructor_capacity_only":false},{"id":1,"kind":"loop_iterations","start":119,"end":245,"offset_unit":"UTF16","source_sha256":"763f5746b14541bf4ba6424c6bce034e7b29ab73394efee7861b67892c3e6067"},{"id":2,"kind":"loop_iterations","start":272,"end":444,"offset_unit":"UTF16","source_sha256":"86617fc81af73eaba80dfdc253f4def1d7eb331ee23549dcad89aafea7533e6c"},{"id":3,"kind":"allocation_events","start":1544,"end":1579,"offset_unit":"UTF16","source_sha256":"29406b21bd722caad7684d4202e031ae81a33a12d6234bc86426d7985f9723f6"},{"id":4,"kind":"allocation_events","start":1822,"end":1861,"offset_unit":"UTF16","source_sha256":"82600c1be2f20d87ea10b1c5dcd3ad845f1079a51afeff65da8fafc9156a30b8"}];
let __ink_work_8866efdb1c1b8d81_counts=[],__ink_work_8866efdb1c1b8d81_unknown=[];
function __ink_work_8866efdb1c1b8d81_hit(i){__ink_work_8866efdb1c1b8d81_counts[i]=(__ink_work_8866efdb1c1b8d81_counts[i]??0)+1;}
function __ink_work_8866efdb1c1b8d81_allocate(i,x){__ink_work_8866efdb1c1b8d81_hit(i);return x;}
function __ink_work_8866efdb1c1b8d81_construct(i,x){if(Array.isArray(x)||ArrayBuffer.isView(x)||x instanceof ArrayBuffer){__ink_work_8866efdb1c1b8d81_hit(i);if(ArrayBuffer.isView(x)&&!__ink_work_8866efdb1c1b8d81_sites[i].constructor_capacity_only)__ink_work_8866efdb1c1b8d81_unknown.push({site:i,components:['copy_bytes'],reason:'typed constructor ingress/copy extent not captured'});}else __ink_work_8866efdb1c1b8d81_unknown.push({site:i,components:['allocation_events'],reason:'constructor allocation behavior unknown'});return x;}
function __ink_work_8866efdb1c1b8d81_invoke(i,name,receiver,method,args){
 // Invoke the original native operation once. A diagnostic callback records
 // actual visits (including sparse-array skipped entries), preserving original
 // this/arguments and exception order. Opaque custom methods are left alone.
 const proto=Object.getPrototypeOf(receiver);
 const standard=Array.isArray(receiver)?proto===Array.prototype&&method===Array.prototype[name]:(ArrayBuffer.isView(receiver)&&typeof receiver.BYTES_PER_ELEMENT==='number'?method===Object.getPrototypeOf(Uint8Array.prototype)[name]:receiver instanceof ArrayBuffer&&method===ArrayBuffer.prototype[name]);
 if(standard&&(name==='map'||name==='filter')&&typeof args[0]==='function'){const callback=args[0];args[0]=function(...values){__ink_work_8866efdb1c1b8d81_hit(__ink_work_8866efdb1c1b8d81_sites[i].callback_site);return Reflect.apply(callback,this,values);};}
 const value=Reflect.apply(method,receiver,args);
 if(!standard){__ink_work_8866efdb1c1b8d81_unknown.push({site:i,components:['allocation_events','copy_bytes','loop_iterations'],reason:'copy method implementation/carrier unknown'});return value;}
 if(name==='concat')__ink_work_8866efdb1c1b8d81_unknown.push({site:i,components:['copy_bytes'],reason:'native concat carrier copy bytes unknown'});
 if(name==='set'){
  if(ArrayBuffer.isView(receiver)&&ArrayBuffer.isView(args[0])&&receiver.BYTES_PER_ELEMENT===args[0].BYTES_PER_ELEMENT)__ink_work_8866efdb1c1b8d81_copy_bytes+=args[0].byteLength;
  else __ink_work_8866efdb1c1b8d81_unknown.push({site:i,components:['copy_bytes'],reason:'set byte extent or conversion unknown'});
 }else if(Array.isArray(value)||ArrayBuffer.isView(value)||value instanceof ArrayBuffer){
  __ink_work_8866efdb1c1b8d81_hit(i);
  if(name==='slice'&&(ArrayBuffer.isView(value)||value instanceof ArrayBuffer))__ink_work_8866efdb1c1b8d81_copy_bytes+=value.byteLength;
  else if(name==='slice')__ink_work_8866efdb1c1b8d81_unknown.push({site:i,components:['copy_bytes'],reason:'JS Array copy bytes/physical storage unknown'});
 }
 return value;
}
let __ink_work_8866efdb1c1b8d81_copy_bytes=0;
export function __ink_work_8866efdb1c1b8d81_reset(){__ink_work_8866efdb1c1b8d81_counts=[];__ink_work_8866efdb1c1b8d81_unknown=[];__ink_work_8866efdb1c1b8d81_copy_bytes=0;}
export function __ink_work_8866efdb1c1b8d81_snapshot(){return {sites:__ink_work_8866efdb1c1b8d81_counts.slice(),copy_bytes:__ink_work_8866efdb1c1b8d81_copy_bytes,unknown:__ink_work_8866efdb1c1b8d81_unknown.slice()};}
function __fn0(v0,v1,v2,v3){
const v4=v0;
const v5=v1;
const v6=Math.min(v4.length,v5.length);
const v7=__ink_work_8866efdb1c1b8d81_construct(0,new Array(v6));
for(let v8=0;v8<v6;v8++){__ink_work_8866efdb1c1b8d81_hit(1);
const v9=v4[v8];
const v10=v5[v8];
const v11=v9;
const v12=v10;
v7[v8]=(Math.imul(v11,v12) >>> 0);
}
const v13=v7;
let v14=v2;
for(let v15=v13.length-1;v15>=0;v15--){__ink_work_8866efdb1c1b8d81_hit(2);
const v16=v13[v15];
const v17=v16;
const v18=v14;
const v19=v3;
const v20=(Math.imul(v18,v19) >>> 0);
v14=(((v17) + (v20)) >>> 0);
}
return v14;}
const __namedTypes={};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v2","core_sha256":"efb84c69a1afd96f6b6eacc0f29fb9133c5917c0fc0eef4e46a86f17500fe7f3","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":null,"index":0,"internal":false,"name":"general40_dot_ordered","params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}}],"named_types":{},"schema":1,"state":null};
const __implementations=[__fn0];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>__ink_work_8866efdb1c1b8d81_allocate(3,[f.name,__implementations[f.index]]))));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[null];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>__ink_work_8866efdb1c1b8d81_allocate(4,[f.name,__intoImplementations[f.index]]))));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}
