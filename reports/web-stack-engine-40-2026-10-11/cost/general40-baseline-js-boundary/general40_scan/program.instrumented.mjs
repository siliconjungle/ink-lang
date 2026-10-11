
const __ink_work_fab74ade90dd7f0d_sites=[{"id":0,"kind":"construction","start":71,"end":84,"offset_unit":"UTF16","source_sha256":"ff384c108acfaa7bca572e56e861d8ad1ed407f05d6c13fdedf3b681791c82a1","constructor_capacity_only":false},{"id":1,"kind":"loop_iterations","start":96,"end":175,"offset_unit":"UTF16","source_sha256":"1de108c81c07358120a524179aa56f3dea7cd63d602d87e6923d079a9962f716"},{"id":2,"kind":"loop_iterations","start":275,"end":369,"offset_unit":"UTF16","source_sha256":"6b28ea4289d9a29aa0602ae955f34775362f3eeeceee2f42b1e7e4347cf49111"},{"id":3,"kind":"allocation_events","start":1567,"end":1602,"offset_unit":"UTF16","source_sha256":"29406b21bd722caad7684d4202e031ae81a33a12d6234bc86426d7985f9723f6"},{"id":4,"kind":"allocation_events","start":1848,"end":1887,"offset_unit":"UTF16","source_sha256":"82600c1be2f20d87ea10b1c5dcd3ad845f1079a51afeff65da8fafc9156a30b8"}];
let __ink_work_fab74ade90dd7f0d_counts=[],__ink_work_fab74ade90dd7f0d_unknown=[];
function __ink_work_fab74ade90dd7f0d_hit(i){__ink_work_fab74ade90dd7f0d_counts[i]=(__ink_work_fab74ade90dd7f0d_counts[i]??0)+1;}
function __ink_work_fab74ade90dd7f0d_allocate(i,x){__ink_work_fab74ade90dd7f0d_hit(i);return x;}
function __ink_work_fab74ade90dd7f0d_construct(i,x){if(Array.isArray(x)||ArrayBuffer.isView(x)||x instanceof ArrayBuffer){__ink_work_fab74ade90dd7f0d_hit(i);if(ArrayBuffer.isView(x)&&!__ink_work_fab74ade90dd7f0d_sites[i].constructor_capacity_only)__ink_work_fab74ade90dd7f0d_unknown.push({site:i,components:['copy_bytes'],reason:'typed constructor ingress/copy extent not captured'});}else __ink_work_fab74ade90dd7f0d_unknown.push({site:i,components:['allocation_events'],reason:'constructor allocation behavior unknown'});return x;}
function __ink_work_fab74ade90dd7f0d_invoke(i,name,receiver,method,args){
 // Invoke the original native operation once. A diagnostic callback records
 // actual visits (including sparse-array skipped entries), preserving original
 // this/arguments and exception order. Opaque custom methods are left alone.
 const proto=Object.getPrototypeOf(receiver);
 const standard=Array.isArray(receiver)?proto===Array.prototype&&method===Array.prototype[name]:(ArrayBuffer.isView(receiver)&&typeof receiver.BYTES_PER_ELEMENT==='number'?method===Object.getPrototypeOf(Uint8Array.prototype)[name]:receiver instanceof ArrayBuffer&&method===ArrayBuffer.prototype[name]);
 if(standard&&(name==='map'||name==='filter')&&typeof args[0]==='function'){const callback=args[0];args[0]=function(...values){__ink_work_fab74ade90dd7f0d_hit(__ink_work_fab74ade90dd7f0d_sites[i].callback_site);return Reflect.apply(callback,this,values);};}
 const value=Reflect.apply(method,receiver,args);
 if(!standard){__ink_work_fab74ade90dd7f0d_unknown.push({site:i,components:['allocation_events','copy_bytes','loop_iterations'],reason:'copy method implementation/carrier unknown'});return value;}
 if(name==='concat')__ink_work_fab74ade90dd7f0d_unknown.push({site:i,components:['copy_bytes'],reason:'native concat carrier copy bytes unknown'});
 if(name==='set'){
  if(ArrayBuffer.isView(receiver)&&ArrayBuffer.isView(args[0])&&receiver.BYTES_PER_ELEMENT===args[0].BYTES_PER_ELEMENT)__ink_work_fab74ade90dd7f0d_copy_bytes+=args[0].byteLength;
  else __ink_work_fab74ade90dd7f0d_unknown.push({site:i,components:['copy_bytes'],reason:'set byte extent or conversion unknown'});
 }else if(Array.isArray(value)||ArrayBuffer.isView(value)||value instanceof ArrayBuffer){
  __ink_work_fab74ade90dd7f0d_hit(i);
  if(name==='slice'&&(ArrayBuffer.isView(value)||value instanceof ArrayBuffer))__ink_work_fab74ade90dd7f0d_copy_bytes+=value.byteLength;
  else if(name==='slice')__ink_work_fab74ade90dd7f0d_unknown.push({site:i,components:['copy_bytes'],reason:'JS Array copy bytes/physical storage unknown'});
 }
 return value;
}
let __ink_work_fab74ade90dd7f0d_copy_bytes=0;
export function __ink_work_fab74ade90dd7f0d_reset(){__ink_work_fab74ade90dd7f0d_counts=[];__ink_work_fab74ade90dd7f0d_unknown=[];__ink_work_fab74ade90dd7f0d_copy_bytes=0;}
export function __ink_work_fab74ade90dd7f0d_snapshot(){return {sites:__ink_work_fab74ade90dd7f0d_counts.slice(),copy_bytes:__ink_work_fab74ade90dd7f0d_copy_bytes,unknown:__ink_work_fab74ade90dd7f0d_unknown.slice()};}
function __fn0(v0,v1,v2,v3){
const v4=v0;
const v5=v4.length;
const v6=__ink_work_fab74ade90dd7f0d_construct(0,new Array(v5));
let v7=0;
for(let v8=0;v8<v5;v8++){__ink_work_fab74ade90dd7f0d_hit(1);
const v9=v4[v8];
v7=(((v7) + (v9)) >>> 0);v6[v8]=v7;}
return v6;}
function __into0(v10,v11,v12,v13,v14){
const v15=v10;
const v16=v15.length;
let v17=0;
for(let v18=0;v18<v16;v18++){__ink_work_fab74ade90dd7f0d_hit(2);
const v19=v15[v18];
v17=(((v17) + (v19)) >>> 0);
v14[v18]=v17;
}
return v16;}
const __namedTypes={};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v2","core_sha256":"b079a4ba008bddfd3460dce625bd32ffeda46effc93172453d1e7094b4e81f49","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":0,"internal":false,"name":"general40_scan","params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"element":{"kind":"u32"},"kind":"list"}}],"named_types":{},"schema":1,"state":null};
const __implementations=[__fn0];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>__ink_work_fab74ade90dd7f0d_allocate(3,[f.name,__implementations[f.index]]))));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[__into0];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>__ink_work_fab74ade90dd7f0d_allocate(4,[f.name,__intoImplementations[f.index]]))));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}
