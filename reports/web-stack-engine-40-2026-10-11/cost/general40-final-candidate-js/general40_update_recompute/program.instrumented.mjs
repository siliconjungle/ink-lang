
const __ink_work_2c40882a2883010a_sites=[{"id":0,"kind":"construction","start":71,"end":84,"offset_unit":"UTF16","source_sha256":"ff384c108acfaa7bca572e56e861d8ad1ed407f05d6c13fdedf3b681791c82a1","constructor_capacity_only":false},{"id":1,"kind":"loop_iterations","start":86,"end":411,"offset_unit":"UTF16","source_sha256":"a9bf35b881245c41984beab75583a6388c434db72c31e5cf3403f875a261183a"},{"id":2,"kind":"loop_iterations","start":500,"end":842,"offset_unit":"UTF16","source_sha256":"4608a106614eaffa0bef491f377349e5151a8ab16c5f957c76affa4029730345"},{"id":3,"kind":"allocation_events","start":2052,"end":2087,"offset_unit":"UTF16","source_sha256":"29406b21bd722caad7684d4202e031ae81a33a12d6234bc86426d7985f9723f6"},{"id":4,"kind":"allocation_events","start":2333,"end":2372,"offset_unit":"UTF16","source_sha256":"82600c1be2f20d87ea10b1c5dcd3ad845f1079a51afeff65da8fafc9156a30b8"}];
let __ink_work_2c40882a2883010a_counts=[],__ink_work_2c40882a2883010a_unknown=[];
function __ink_work_2c40882a2883010a_hit(i){__ink_work_2c40882a2883010a_counts[i]=(__ink_work_2c40882a2883010a_counts[i]??0)+1;}
function __ink_work_2c40882a2883010a_allocate(i,x){__ink_work_2c40882a2883010a_hit(i);return x;}
function __ink_work_2c40882a2883010a_construct(i,x){if(Array.isArray(x)||ArrayBuffer.isView(x)||x instanceof ArrayBuffer){__ink_work_2c40882a2883010a_hit(i);if(ArrayBuffer.isView(x)&&!__ink_work_2c40882a2883010a_sites[i].constructor_capacity_only)__ink_work_2c40882a2883010a_unknown.push({site:i,components:['copy_bytes'],reason:'typed constructor ingress/copy extent not captured'});}else __ink_work_2c40882a2883010a_unknown.push({site:i,components:['allocation_events'],reason:'constructor allocation behavior unknown'});return x;}
function __ink_work_2c40882a2883010a_invoke(i,name,receiver,method,args){
 // Invoke the original native operation once. A diagnostic callback records
 // actual visits (including sparse-array skipped entries), preserving original
 // this/arguments and exception order. Opaque custom methods are left alone.
 const proto=Object.getPrototypeOf(receiver);
 const standard=Array.isArray(receiver)?proto===Array.prototype&&method===Array.prototype[name]:(ArrayBuffer.isView(receiver)&&typeof receiver.BYTES_PER_ELEMENT==='number'?method===Object.getPrototypeOf(Uint8Array.prototype)[name]:receiver instanceof ArrayBuffer&&method===ArrayBuffer.prototype[name]);
 if(standard&&(name==='map'||name==='filter')&&typeof args[0]==='function'){const callback=args[0];args[0]=function(...values){__ink_work_2c40882a2883010a_hit(__ink_work_2c40882a2883010a_sites[i].callback_site);return Reflect.apply(callback,this,values);};}
 const value=Reflect.apply(method,receiver,args);
 if(!standard){__ink_work_2c40882a2883010a_unknown.push({site:i,components:['allocation_events','copy_bytes','loop_iterations'],reason:'copy method implementation/carrier unknown'});return value;}
 if(name==='concat')__ink_work_2c40882a2883010a_unknown.push({site:i,components:['copy_bytes'],reason:'native concat carrier copy bytes unknown'});
 if(name==='set'){
  if(ArrayBuffer.isView(receiver)&&ArrayBuffer.isView(args[0])&&receiver.BYTES_PER_ELEMENT===args[0].BYTES_PER_ELEMENT)__ink_work_2c40882a2883010a_copy_bytes+=args[0].byteLength;
  else __ink_work_2c40882a2883010a_unknown.push({site:i,components:['copy_bytes'],reason:'set byte extent or conversion unknown'});
 }else if(Array.isArray(value)||ArrayBuffer.isView(value)||value instanceof ArrayBuffer){
  __ink_work_2c40882a2883010a_hit(i);
  if(name==='slice'&&(ArrayBuffer.isView(value)||value instanceof ArrayBuffer))__ink_work_2c40882a2883010a_copy_bytes+=value.byteLength;
  else if(name==='slice')__ink_work_2c40882a2883010a_unknown.push({site:i,components:['copy_bytes'],reason:'JS Array copy bytes/physical storage unknown'});
 }
 return value;
}
let __ink_work_2c40882a2883010a_copy_bytes=0;
export function __ink_work_2c40882a2883010a_reset(){__ink_work_2c40882a2883010a_counts=[];__ink_work_2c40882a2883010a_unknown=[];__ink_work_2c40882a2883010a_copy_bytes=0;}
export function __ink_work_2c40882a2883010a_snapshot(){return {sites:__ink_work_2c40882a2883010a_counts.slice(),copy_bytes:__ink_work_2c40882a2883010a_copy_bytes,unknown:__ink_work_2c40882a2883010a_unknown.slice()};}
function __fn0(v0,v1,v2,v3){
const v4=v0;
const v5=v4.length;
const v6=__ink_work_2c40882a2883010a_construct(0,new Array(v5));
for(let v7=0;v7<v5;v7++){__ink_work_2c40882a2883010a_hit(1);
const v8=v4[v7];
const v9=(v7>>>0);
const v10=v9;
const v11=v3;
let v12;if(v11===0 ){
v12=1;}else{
v12=((v10%v11)+0);}
const v13=v12;
const v14=0;
let v15;if(((v13) === (v14))){
const v16=v1;
const v17=v9;
let v18;if(v17<v16.length){v18=v16[v17];}else{
v18=v8;}
v15=v18;}else{
v15=v8;}
v6[v7]=v15;
}
return v6;}
function __into0(v19,v20,v21,v22,v23){
const v24=v19;
const v25=v24.length;
for(let v27=0;v27<v25;v27++){__ink_work_2c40882a2883010a_hit(2);
const v28=v24[v27];
const v29=(v27>>>0);
const v30=v29;
const v31=v22;
let v32;if(v31===0 ){
v32=1;}else{
v32=((v30%v31)+0);}
const v33=v32;
const v34=0;
let v35;if(((v33) === (v34))){
const v36=v20;
const v37=v29;
let v38;if(v37<v36.length){v38=v36[v37];}else{
v38=v28;}
v35=v38;}else{
v35=v28;}
v23[v27]=v35;
}
return v25;}
const __namedTypes={};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v2","core_sha256":"364083e393eac6399a7dd754ead1afa86bca1889cd29b5600a0512191bdecf0b","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":0,"internal":false,"name":"general40_update_recompute","params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"element":{"kind":"u32"},"kind":"list"}}],"named_types":{},"schema":1,"state":null};
const __implementations=[__fn0];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>__ink_work_2c40882a2883010a_allocate(3,[f.name,__implementations[f.index]]))));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[__into0];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>__ink_work_2c40882a2883010a_allocate(4,[f.name,__intoImplementations[f.index]]))));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}
