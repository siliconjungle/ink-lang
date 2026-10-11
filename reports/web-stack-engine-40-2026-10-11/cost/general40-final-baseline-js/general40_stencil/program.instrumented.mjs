
const __ink_work_f7e4ab3fdfa37271_sites=[{"id":0,"kind":"construction","start":71,"end":84,"offset_unit":"UTF16","source_sha256":"ff384c108acfaa7bca572e56e861d8ad1ed407f05d6c13fdedf3b681791c82a1","constructor_capacity_only":false},{"id":1,"kind":"loop_iterations","start":86,"end":574,"offset_unit":"UTF16","source_sha256":"f94ad825e07906f1b7fcafa3c9cb06c16b02d5dad21e7ac465249e0b45edfebd"},{"id":2,"kind":"loop_iterations","start":663,"end":1168,"offset_unit":"UTF16","source_sha256":"c1b5403e4f0c59bf0b70f94c5df83f6ba6a3b8b2c866e4ad760d0478307c4481"},{"id":3,"kind":"allocation_events","start":2369,"end":2404,"offset_unit":"UTF16","source_sha256":"29406b21bd722caad7684d4202e031ae81a33a12d6234bc86426d7985f9723f6"},{"id":4,"kind":"allocation_events","start":2650,"end":2689,"offset_unit":"UTF16","source_sha256":"82600c1be2f20d87ea10b1c5dcd3ad845f1079a51afeff65da8fafc9156a30b8"}];
let __ink_work_f7e4ab3fdfa37271_counts=[],__ink_work_f7e4ab3fdfa37271_unknown=[];
function __ink_work_f7e4ab3fdfa37271_hit(i){__ink_work_f7e4ab3fdfa37271_counts[i]=(__ink_work_f7e4ab3fdfa37271_counts[i]??0)+1;}
function __ink_work_f7e4ab3fdfa37271_allocate(i,x){__ink_work_f7e4ab3fdfa37271_hit(i);return x;}
function __ink_work_f7e4ab3fdfa37271_construct(i,x){if(Array.isArray(x)||ArrayBuffer.isView(x)||x instanceof ArrayBuffer){__ink_work_f7e4ab3fdfa37271_hit(i);if(ArrayBuffer.isView(x)&&!__ink_work_f7e4ab3fdfa37271_sites[i].constructor_capacity_only)__ink_work_f7e4ab3fdfa37271_unknown.push({site:i,components:['copy_bytes'],reason:'typed constructor ingress/copy extent not captured'});}else __ink_work_f7e4ab3fdfa37271_unknown.push({site:i,components:['allocation_events'],reason:'constructor allocation behavior unknown'});return x;}
function __ink_work_f7e4ab3fdfa37271_invoke(i,name,receiver,method,args){
 // Invoke the original native operation once. A diagnostic callback records
 // actual visits (including sparse-array skipped entries), preserving original
 // this/arguments and exception order. Opaque custom methods are left alone.
 const proto=Object.getPrototypeOf(receiver);
 const standard=Array.isArray(receiver)?proto===Array.prototype&&method===Array.prototype[name]:(ArrayBuffer.isView(receiver)&&typeof receiver.BYTES_PER_ELEMENT==='number'?method===Object.getPrototypeOf(Uint8Array.prototype)[name]:receiver instanceof ArrayBuffer&&method===ArrayBuffer.prototype[name]);
 if(standard&&(name==='map'||name==='filter')&&typeof args[0]==='function'){const callback=args[0];args[0]=function(...values){__ink_work_f7e4ab3fdfa37271_hit(__ink_work_f7e4ab3fdfa37271_sites[i].callback_site);return Reflect.apply(callback,this,values);};}
 const value=Reflect.apply(method,receiver,args);
 if(!standard){__ink_work_f7e4ab3fdfa37271_unknown.push({site:i,components:['allocation_events','copy_bytes','loop_iterations'],reason:'copy method implementation/carrier unknown'});return value;}
 if(name==='concat')__ink_work_f7e4ab3fdfa37271_unknown.push({site:i,components:['copy_bytes'],reason:'native concat carrier copy bytes unknown'});
 if(name==='set'){
  if(ArrayBuffer.isView(receiver)&&ArrayBuffer.isView(args[0])&&receiver.BYTES_PER_ELEMENT===args[0].BYTES_PER_ELEMENT)__ink_work_f7e4ab3fdfa37271_copy_bytes+=args[0].byteLength;
  else __ink_work_f7e4ab3fdfa37271_unknown.push({site:i,components:['copy_bytes'],reason:'set byte extent or conversion unknown'});
 }else if(Array.isArray(value)||ArrayBuffer.isView(value)||value instanceof ArrayBuffer){
  __ink_work_f7e4ab3fdfa37271_hit(i);
  if(name==='slice'&&(ArrayBuffer.isView(value)||value instanceof ArrayBuffer))__ink_work_f7e4ab3fdfa37271_copy_bytes+=value.byteLength;
  else if(name==='slice')__ink_work_f7e4ab3fdfa37271_unknown.push({site:i,components:['copy_bytes'],reason:'JS Array copy bytes/physical storage unknown'});
 }
 return value;
}
let __ink_work_f7e4ab3fdfa37271_copy_bytes=0;
export function __ink_work_f7e4ab3fdfa37271_reset(){__ink_work_f7e4ab3fdfa37271_counts=[];__ink_work_f7e4ab3fdfa37271_unknown=[];__ink_work_f7e4ab3fdfa37271_copy_bytes=0;}
export function __ink_work_f7e4ab3fdfa37271_snapshot(){return {sites:__ink_work_f7e4ab3fdfa37271_counts.slice(),copy_bytes:__ink_work_f7e4ab3fdfa37271_copy_bytes,unknown:__ink_work_f7e4ab3fdfa37271_unknown.slice()};}
function __fn0(v0,v1,v2,v3){
const v4=v0;
const v5=v4.length;
const v6=__ink_work_f7e4ab3fdfa37271_construct(0,new Array(v5));
for(let v7=0;v7<v5;v7++){__ink_work_f7e4ab3fdfa37271_hit(1);
const v8=v4[v7];
const v9=(v7>>>0);
const v10=v0;
const v11=v9;
const v12=1;
const v13=(((v11) - (v12)) >>> 0);
let v14;if(v13<v10.length){v14=v10[v13];}else{
v14=0;}
const v15=v14;
const v16=v8;
const v17=v3;
const v18=(Math.imul(v16,v17) >>> 0);
const v19=(((v15) + (v18)) >>> 0);
const v20=v0;
const v21=v9;
const v22=1;
const v23=(((v21) + (v22)) >>> 0);
let v24;if(v23<v20.length){v24=v20[v23];}else{
v24=0;}
const v25=v24;
v6[v7]=(((v19) + (v25)) >>> 0);
}
return v6;}
function __into0(v26,v27,v28,v29,v30){
const v31=v26;
const v32=v31.length;
for(let v34=0;v34<v32;v34++){__ink_work_f7e4ab3fdfa37271_hit(2);
const v35=v31[v34];
const v36=(v34>>>0);
const v37=v26;
const v38=v36;
const v39=1;
const v40=(((v38) - (v39)) >>> 0);
let v41;if(v40<v37.length){v41=v37[v40];}else{
v41=0;}
const v42=v41;
const v43=v35;
const v44=v29;
const v45=(Math.imul(v43,v44) >>> 0);
const v46=(((v42) + (v45)) >>> 0);
const v47=v26;
const v48=v36;
const v49=1;
const v50=(((v48) + (v49)) >>> 0);
let v51;if(v50<v47.length){v51=v47[v50];}else{
v51=0;}
const v52=v51;
v30[v34]=(((v46) + (v52)) >>> 0);
}
return v32;}
const __namedTypes={};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v2","core_sha256":"517e03cc87e88e55fac495804c91f3814e400fc19f7b666a8bb931e215c12167","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":0,"internal":false,"name":"general40_stencil","params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"element":{"kind":"u32"},"kind":"list"}}],"named_types":{},"schema":1,"state":null};
const __implementations=[__fn0];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>__ink_work_f7e4ab3fdfa37271_allocate(3,[f.name,__implementations[f.index]]))));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[__into0];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>__ink_work_f7e4ab3fdfa37271_allocate(4,[f.name,__intoImplementations[f.index]]))));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}
