
const __ink_work_035a4c5eac0fdcbf_sites=[{"id":0,"kind":"allocation_events","start":71,"end":73,"offset_unit":"UTF16","source_sha256":"4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945"},{"id":1,"kind":"loop_iterations","start":75,"end":263,"offset_unit":"UTF16","source_sha256":"1362730b66305bcd5436e51e56586d9a94d1e7516fb1c1fe2532142dd21f1e21"},{"id":2,"kind":"loop_iterations","start":315,"end":480,"offset_unit":"UTF16","source_sha256":"820be7bd16ffb71f90535eb8f1f7888115d1ae096d1b4094d557a07328242b13"},{"id":3,"kind":"loop_iterations","start":581,"end":785,"offset_unit":"UTF16","source_sha256":"2028b908904c27fbf023f82eee309a31de189c2ccbdb3f9fd3a26e9e822c2120"},{"id":4,"kind":"loop_iterations","start":786,"end":952,"offset_unit":"UTF16","source_sha256":"34f2b3617ac53b0fbe019d0f7deb730fb187f81be74bef517f0043423a1003c7"},{"id":5,"kind":"allocation_events","start":2156,"end":2191,"offset_unit":"UTF16","source_sha256":"29406b21bd722caad7684d4202e031ae81a33a12d6234bc86426d7985f9723f6"},{"id":6,"kind":"allocation_events","start":2437,"end":2476,"offset_unit":"UTF16","source_sha256":"82600c1be2f20d87ea10b1c5dcd3ad845f1079a51afeff65da8fafc9156a30b8"}];
let __ink_work_035a4c5eac0fdcbf_counts=[],__ink_work_035a4c5eac0fdcbf_unknown=[];
function __ink_work_035a4c5eac0fdcbf_hit(i){__ink_work_035a4c5eac0fdcbf_counts[i]=(__ink_work_035a4c5eac0fdcbf_counts[i]??0)+1;}
function __ink_work_035a4c5eac0fdcbf_allocate(i,x){__ink_work_035a4c5eac0fdcbf_hit(i);return x;}
function __ink_work_035a4c5eac0fdcbf_construct(i,x){if(Array.isArray(x)||ArrayBuffer.isView(x)||x instanceof ArrayBuffer){__ink_work_035a4c5eac0fdcbf_hit(i);if(ArrayBuffer.isView(x)&&!__ink_work_035a4c5eac0fdcbf_sites[i].constructor_capacity_only)__ink_work_035a4c5eac0fdcbf_unknown.push({site:i,components:['copy_bytes'],reason:'typed constructor ingress/copy extent not captured'});}else __ink_work_035a4c5eac0fdcbf_unknown.push({site:i,components:['allocation_events'],reason:'constructor allocation behavior unknown'});return x;}
function __ink_work_035a4c5eac0fdcbf_invoke(i,name,receiver,method,args){
 // Invoke the original native operation once. A diagnostic callback records
 // actual visits (including sparse-array skipped entries), preserving original
 // this/arguments and exception order. Opaque custom methods are left alone.
 const proto=Object.getPrototypeOf(receiver);
 const standard=Array.isArray(receiver)?proto===Array.prototype&&method===Array.prototype[name]:(ArrayBuffer.isView(receiver)&&typeof receiver.BYTES_PER_ELEMENT==='number'?method===Object.getPrototypeOf(Uint8Array.prototype)[name]:receiver instanceof ArrayBuffer&&method===ArrayBuffer.prototype[name]);
 if(standard&&(name==='map'||name==='filter')&&typeof args[0]==='function'){const callback=args[0];args[0]=function(...values){__ink_work_035a4c5eac0fdcbf_hit(__ink_work_035a4c5eac0fdcbf_sites[i].callback_site);return Reflect.apply(callback,this,values);};}
 const value=Reflect.apply(method,receiver,args);
 if(!standard){__ink_work_035a4c5eac0fdcbf_unknown.push({site:i,components:['allocation_events','copy_bytes','loop_iterations'],reason:'copy method implementation/carrier unknown'});return value;}
 if(name==='concat')__ink_work_035a4c5eac0fdcbf_unknown.push({site:i,components:['copy_bytes'],reason:'native concat carrier copy bytes unknown'});
 if(name==='set'){
  if(ArrayBuffer.isView(receiver)&&ArrayBuffer.isView(args[0])&&receiver.BYTES_PER_ELEMENT===args[0].BYTES_PER_ELEMENT)__ink_work_035a4c5eac0fdcbf_copy_bytes+=args[0].byteLength;
  else __ink_work_035a4c5eac0fdcbf_unknown.push({site:i,components:['copy_bytes'],reason:'set byte extent or conversion unknown'});
 }else if(Array.isArray(value)||ArrayBuffer.isView(value)||value instanceof ArrayBuffer){
  __ink_work_035a4c5eac0fdcbf_hit(i);
  if(name==='slice'&&(ArrayBuffer.isView(value)||value instanceof ArrayBuffer))__ink_work_035a4c5eac0fdcbf_copy_bytes+=value.byteLength;
  else if(name==='slice')__ink_work_035a4c5eac0fdcbf_unknown.push({site:i,components:['copy_bytes'],reason:'JS Array copy bytes/physical storage unknown'});
 }
 return value;
}
let __ink_work_035a4c5eac0fdcbf_copy_bytes=0;
export function __ink_work_035a4c5eac0fdcbf_reset(){__ink_work_035a4c5eac0fdcbf_counts=[];__ink_work_035a4c5eac0fdcbf_unknown=[];__ink_work_035a4c5eac0fdcbf_copy_bytes=0;}
export function __ink_work_035a4c5eac0fdcbf_snapshot(){return {sites:__ink_work_035a4c5eac0fdcbf_counts.slice(),copy_bytes:__ink_work_035a4c5eac0fdcbf_copy_bytes,unknown:__ink_work_035a4c5eac0fdcbf_unknown.slice()};}
function __fn0(v0,v1,v2,v3){
const v4=v0;
const v5=v4.length;
const v6=__ink_work_035a4c5eac0fdcbf_allocate(0,[]);
for(let v7=0;v7<v5;v7++){__ink_work_035a4c5eac0fdcbf_hit(1);
const v8=v4[v7];
const v9=v8;
const v10=16;
let v11;if(v10===0 ){
v11=0;}else{
v11=((v9%v10)+0);}
const v12=v11;
const v13=v2;
if(((v12) < (v13))){v6.push(v8);}
}
const v14=v6;
const v15=v14.length;
const v16=v14;
for(let v17=0;v17<v15;v17++){__ink_work_035a4c5eac0fdcbf_hit(2);
const v18=v14[v17];
const v19=v18;
const v20=v3;
const v21=(Math.imul(v19,v20) >>> 0);
const v22=1;
v16[v17]=(((v21) + (v22)) >>> 0);
}
return v16;}
function __into0(v23,v24,v25,v26,v27){
const v28=v23;
const v29=v28.length;
let v30=0;
for(let v31=0;v31<v29;v31++){__ink_work_035a4c5eac0fdcbf_hit(3);
const v32=v28[v31];
const v33=v32;
const v34=16;
let v35;if(v34===0 ){
v35=0;}else{
v35=((v33%v34)+0);}
const v36=v35;
const v37=v25;
if(((v36) < (v37))){
v27[v30++]=v32;
}
}
for(let v39=0;v39<v30;v39++){__ink_work_035a4c5eac0fdcbf_hit(4);
const v40=v27[v39];
const v41=v40;
const v42=v26;
const v43=(Math.imul(v41,v42) >>> 0);
const v44=1;
v27[v39]=(((v43) + (v44)) >>> 0);
}
return v30;}
const __namedTypes={};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v2","core_sha256":"ebf608987da15475bc7d262e45e65570fdcf0c1cceabe287b89b49f93466421f","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":0,"internal":false,"name":"general40_compaction","params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"element":{"kind":"u32"},"kind":"list"}}],"named_types":{},"schema":1,"state":null};
const __implementations=[__fn0];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>__ink_work_035a4c5eac0fdcbf_allocate(5,[f.name,__implementations[f.index]]))));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[__into0];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>__ink_work_035a4c5eac0fdcbf_allocate(6,[f.name,__intoImplementations[f.index]]))));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}
