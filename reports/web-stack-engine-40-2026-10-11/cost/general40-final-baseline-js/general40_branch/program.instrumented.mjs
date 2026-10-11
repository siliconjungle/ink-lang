
const __ink_work_71aa5780b86b893d_sites=[{"id":0,"kind":"construction","start":71,"end":84,"offset_unit":"UTF16","source_sha256":"ff384c108acfaa7bca572e56e861d8ad1ed407f05d6c13fdedf3b681791c82a1","constructor_capacity_only":false},{"id":1,"kind":"loop_iterations","start":86,"end":463,"offset_unit":"UTF16","source_sha256":"6cf1f8b221fff4a8fe0ab574d40d211d5e46b9bb00c26893e871668e909ce944"},{"id":2,"kind":"loop_iterations","start":552,"end":947,"offset_unit":"UTF16","source_sha256":"58e31ee03764fa88caf9af6d5546aeb001f17d07edd12e5bedc9e1a3aa41a57a"},{"id":3,"kind":"allocation_events","start":2147,"end":2182,"offset_unit":"UTF16","source_sha256":"29406b21bd722caad7684d4202e031ae81a33a12d6234bc86426d7985f9723f6"},{"id":4,"kind":"allocation_events","start":2428,"end":2467,"offset_unit":"UTF16","source_sha256":"82600c1be2f20d87ea10b1c5dcd3ad845f1079a51afeff65da8fafc9156a30b8"}];
let __ink_work_71aa5780b86b893d_counts=[],__ink_work_71aa5780b86b893d_unknown=[];
function __ink_work_71aa5780b86b893d_hit(i){__ink_work_71aa5780b86b893d_counts[i]=(__ink_work_71aa5780b86b893d_counts[i]??0)+1;}
function __ink_work_71aa5780b86b893d_allocate(i,x){__ink_work_71aa5780b86b893d_hit(i);return x;}
function __ink_work_71aa5780b86b893d_construct(i,x){if(Array.isArray(x)||ArrayBuffer.isView(x)||x instanceof ArrayBuffer){__ink_work_71aa5780b86b893d_hit(i);if(ArrayBuffer.isView(x)&&!__ink_work_71aa5780b86b893d_sites[i].constructor_capacity_only)__ink_work_71aa5780b86b893d_unknown.push({site:i,components:['copy_bytes'],reason:'typed constructor ingress/copy extent not captured'});}else __ink_work_71aa5780b86b893d_unknown.push({site:i,components:['allocation_events'],reason:'constructor allocation behavior unknown'});return x;}
function __ink_work_71aa5780b86b893d_invoke(i,name,receiver,method,args){
 // Invoke the original native operation once. A diagnostic callback records
 // actual visits (including sparse-array skipped entries), preserving original
 // this/arguments and exception order. Opaque custom methods are left alone.
 const proto=Object.getPrototypeOf(receiver);
 const standard=Array.isArray(receiver)?proto===Array.prototype&&method===Array.prototype[name]:(ArrayBuffer.isView(receiver)&&typeof receiver.BYTES_PER_ELEMENT==='number'?method===Object.getPrototypeOf(Uint8Array.prototype)[name]:receiver instanceof ArrayBuffer&&method===ArrayBuffer.prototype[name]);
 if(standard&&(name==='map'||name==='filter')&&typeof args[0]==='function'){const callback=args[0];args[0]=function(...values){__ink_work_71aa5780b86b893d_hit(__ink_work_71aa5780b86b893d_sites[i].callback_site);return Reflect.apply(callback,this,values);};}
 const value=Reflect.apply(method,receiver,args);
 if(!standard){__ink_work_71aa5780b86b893d_unknown.push({site:i,components:['allocation_events','copy_bytes','loop_iterations'],reason:'copy method implementation/carrier unknown'});return value;}
 if(name==='concat')__ink_work_71aa5780b86b893d_unknown.push({site:i,components:['copy_bytes'],reason:'native concat carrier copy bytes unknown'});
 if(name==='set'){
  if(ArrayBuffer.isView(receiver)&&ArrayBuffer.isView(args[0])&&receiver.BYTES_PER_ELEMENT===args[0].BYTES_PER_ELEMENT)__ink_work_71aa5780b86b893d_copy_bytes+=args[0].byteLength;
  else __ink_work_71aa5780b86b893d_unknown.push({site:i,components:['copy_bytes'],reason:'set byte extent or conversion unknown'});
 }else if(Array.isArray(value)||ArrayBuffer.isView(value)||value instanceof ArrayBuffer){
  __ink_work_71aa5780b86b893d_hit(i);
  if(name==='slice'&&(ArrayBuffer.isView(value)||value instanceof ArrayBuffer))__ink_work_71aa5780b86b893d_copy_bytes+=value.byteLength;
  else if(name==='slice')__ink_work_71aa5780b86b893d_unknown.push({site:i,components:['copy_bytes'],reason:'JS Array copy bytes/physical storage unknown'});
 }
 return value;
}
let __ink_work_71aa5780b86b893d_copy_bytes=0;
export function __ink_work_71aa5780b86b893d_reset(){__ink_work_71aa5780b86b893d_counts=[];__ink_work_71aa5780b86b893d_unknown=[];__ink_work_71aa5780b86b893d_copy_bytes=0;}
export function __ink_work_71aa5780b86b893d_snapshot(){return {sites:__ink_work_71aa5780b86b893d_counts.slice(),copy_bytes:__ink_work_71aa5780b86b893d_copy_bytes,unknown:__ink_work_71aa5780b86b893d_unknown.slice()};}
function __fn0(v0,v1,v2,v3){
const v4=v0;
const v5=v4.length;
const v6=__ink_work_71aa5780b86b893d_construct(0,new Array(v5));
for(let v7=0;v7<v5;v7++){__ink_work_71aa5780b86b893d_hit(1);
const v8=v4[v7];
const v9=v8;
const v10=v2;
let v11;if(((v9) < (v10))){
const v12=v8;
const v13=v3;
const v14=(Math.imul(v12,v13) >>> 0);
const v15=1;
v11=(((v14) + (v15)) >>> 0);}else{
const v16=v8;
const v17=v3;
let v18;if(v17===0 ){
v18=0;}else{
v18=(Math.trunc(v16/v17)+0);}
const v19=v18;
const v20=v2;
v11=(((v19) + (v20)) >>> 0);}
v6[v7]=v11;
}
return v6;}
function __into0(v21,v22,v23,v24,v25){
const v26=v21;
const v27=v26.length;
for(let v29=0;v29<v27;v29++){__ink_work_71aa5780b86b893d_hit(2);
const v30=v26[v29];
const v31=v30;
const v32=v23;
let v33;if(((v31) < (v32))){
const v34=v30;
const v35=v24;
const v36=(Math.imul(v34,v35) >>> 0);
const v37=1;
v33=(((v36) + (v37)) >>> 0);}else{
const v38=v30;
const v39=v24;
let v40;if(v39===0 ){
v40=0;}else{
v40=(Math.trunc(v38/v39)+0);}
const v41=v40;
const v42=v23;
v33=(((v41) + (v42)) >>> 0);}
v25[v29]=v33;
}
return v27;}
const __namedTypes={};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v2","core_sha256":"2ac82b3579f66411fbfa152c99219c297daa701395a352630accc848f7a2882f","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":0,"internal":false,"name":"general40_branch","params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"element":{"kind":"u32"},"kind":"list"}}],"named_types":{},"schema":1,"state":null};
const __implementations=[__fn0];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>__ink_work_71aa5780b86b893d_allocate(3,[f.name,__implementations[f.index]]))));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[__into0];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>__ink_work_71aa5780b86b893d_allocate(4,[f.name,__intoImplementations[f.index]]))));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}
