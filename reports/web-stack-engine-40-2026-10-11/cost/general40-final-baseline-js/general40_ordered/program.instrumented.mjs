
const __ink_work_4e9db5e0a6b91e23_sites=[{"id":0,"kind":"loop_iterations","start":53,"end":341,"offset_unit":"UTF16","source_sha256":"4d2fbd88daeff624e013838781ec81821a175934babbfd00a19bb479f401029a"},{"id":1,"kind":"allocation_events","start":1436,"end":1471,"offset_unit":"UTF16","source_sha256":"29406b21bd722caad7684d4202e031ae81a33a12d6234bc86426d7985f9723f6"},{"id":2,"kind":"allocation_events","start":1714,"end":1753,"offset_unit":"UTF16","source_sha256":"82600c1be2f20d87ea10b1c5dcd3ad845f1079a51afeff65da8fafc9156a30b8"}];
let __ink_work_4e9db5e0a6b91e23_counts=[],__ink_work_4e9db5e0a6b91e23_unknown=[];
function __ink_work_4e9db5e0a6b91e23_hit(i){__ink_work_4e9db5e0a6b91e23_counts[i]=(__ink_work_4e9db5e0a6b91e23_counts[i]??0)+1;}
function __ink_work_4e9db5e0a6b91e23_allocate(i,x){__ink_work_4e9db5e0a6b91e23_hit(i);return x;}
function __ink_work_4e9db5e0a6b91e23_construct(i,x){if(Array.isArray(x)||ArrayBuffer.isView(x)||x instanceof ArrayBuffer){__ink_work_4e9db5e0a6b91e23_hit(i);if(ArrayBuffer.isView(x)&&!__ink_work_4e9db5e0a6b91e23_sites[i].constructor_capacity_only)__ink_work_4e9db5e0a6b91e23_unknown.push({site:i,components:['copy_bytes'],reason:'typed constructor ingress/copy extent not captured'});}else __ink_work_4e9db5e0a6b91e23_unknown.push({site:i,components:['allocation_events'],reason:'constructor allocation behavior unknown'});return x;}
function __ink_work_4e9db5e0a6b91e23_invoke(i,name,receiver,method,args){
 // Invoke the original native operation once. A diagnostic callback records
 // actual visits (including sparse-array skipped entries), preserving original
 // this/arguments and exception order. Opaque custom methods are left alone.
 const proto=Object.getPrototypeOf(receiver);
 const standard=Array.isArray(receiver)?proto===Array.prototype&&method===Array.prototype[name]:(ArrayBuffer.isView(receiver)&&typeof receiver.BYTES_PER_ELEMENT==='number'?method===Object.getPrototypeOf(Uint8Array.prototype)[name]:receiver instanceof ArrayBuffer&&method===ArrayBuffer.prototype[name]);
 if(standard&&(name==='map'||name==='filter')&&typeof args[0]==='function'){const callback=args[0];args[0]=function(...values){__ink_work_4e9db5e0a6b91e23_hit(__ink_work_4e9db5e0a6b91e23_sites[i].callback_site);return Reflect.apply(callback,this,values);};}
 const value=Reflect.apply(method,receiver,args);
 if(!standard){__ink_work_4e9db5e0a6b91e23_unknown.push({site:i,components:['allocation_events','copy_bytes','loop_iterations'],reason:'copy method implementation/carrier unknown'});return value;}
 if(name==='concat')__ink_work_4e9db5e0a6b91e23_unknown.push({site:i,components:['copy_bytes'],reason:'native concat carrier copy bytes unknown'});
 if(name==='set'){
  if(ArrayBuffer.isView(receiver)&&ArrayBuffer.isView(args[0])&&receiver.BYTES_PER_ELEMENT===args[0].BYTES_PER_ELEMENT)__ink_work_4e9db5e0a6b91e23_copy_bytes+=args[0].byteLength;
  else __ink_work_4e9db5e0a6b91e23_unknown.push({site:i,components:['copy_bytes'],reason:'set byte extent or conversion unknown'});
 }else if(Array.isArray(value)||ArrayBuffer.isView(value)||value instanceof ArrayBuffer){
  __ink_work_4e9db5e0a6b91e23_hit(i);
  if(name==='slice'&&(ArrayBuffer.isView(value)||value instanceof ArrayBuffer))__ink_work_4e9db5e0a6b91e23_copy_bytes+=value.byteLength;
  else if(name==='slice')__ink_work_4e9db5e0a6b91e23_unknown.push({site:i,components:['copy_bytes'],reason:'JS Array copy bytes/physical storage unknown'});
 }
 return value;
}
let __ink_work_4e9db5e0a6b91e23_copy_bytes=0;
export function __ink_work_4e9db5e0a6b91e23_reset(){__ink_work_4e9db5e0a6b91e23_counts=[];__ink_work_4e9db5e0a6b91e23_unknown=[];__ink_work_4e9db5e0a6b91e23_copy_bytes=0;}
export function __ink_work_4e9db5e0a6b91e23_snapshot(){return {sites:__ink_work_4e9db5e0a6b91e23_counts.slice(),copy_bytes:__ink_work_4e9db5e0a6b91e23_copy_bytes,unknown:__ink_work_4e9db5e0a6b91e23_unknown.slice()};}
function __fn0(v0,v1,v2,v3){
const v4=v0;
let v5=v2;
for(let v6=v4.length-1;v6>=0;v6--){__ink_work_4e9db5e0a6b91e23_hit(0);
const v7=v4[v6];
const v8=v5;
const v9=v2;
let v10;if(((v8) < (v9))){
const v11=v7;
const v12=v5;
const v13=v3;
const v14=(Math.imul(v12,v13) >>> 0);
v10=(((v11) + (v14)) >>> 0);}else{
const v15=v7;
const v16=v5;
v10=(((v15) - (v16)) >>> 0);}
v5=v10;
}
return v5;}
const __namedTypes={};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v1","core_sha256":"46024840ef3e3db0e8f5503b1dd2c93cc2e200f26b0b026b435188e6a50598c0","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":null,"index":0,"internal":false,"name":"general40_ordered","params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}}],"named_types":{},"schema":1,"state":null};
const __implementations=[__fn0];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>__ink_work_4e9db5e0a6b91e23_allocate(1,[f.name,__implementations[f.index]]))));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[null];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>__ink_work_4e9db5e0a6b91e23_allocate(2,[f.name,__intoImplementations[f.index]]))));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}
