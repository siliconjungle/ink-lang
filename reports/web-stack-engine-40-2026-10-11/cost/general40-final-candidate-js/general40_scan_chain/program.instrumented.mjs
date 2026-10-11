
const __ink_work_d3eb7683a9902869_sites=[{"id":0,"kind":"construction","start":71,"end":84,"offset_unit":"UTF16","source_sha256":"ff384c108acfaa7bca572e56e861d8ad1ed407f05d6c13fdedf3b681791c82a1","constructor_capacity_only":false},{"id":1,"kind":"loop_iterations","start":86,"end":458,"offset_unit":"UTF16","source_sha256":"26693f9440081f7a1b34dcbdcd359d12225e5a4fc25456ee47c3f8ad0262ec67"},{"id":2,"kind":"loop_iterations","start":521,"end":613,"offset_unit":"UTF16","source_sha256":"ac95ac50144ed8f2532dce6d9b25e9af39014743383094af55f6c78c8704b8ab"},{"id":3,"kind":"loop_iterations","start":1181,"end":1567,"offset_unit":"UTF16","source_sha256":"21ff732177d69489f44ece598d989b0e7d6959179e81063f3df998c95cc5ed4c"},{"id":4,"kind":"loop_iterations","start":1579,"end":1673,"offset_unit":"UTF16","source_sha256":"697dfdb9679b54816eb88699e454a44295c1e0b26bf49f7c24e7e49d8ae4c87e"},{"id":5,"kind":"allocation_events","start":3276,"end":3311,"offset_unit":"UTF16","source_sha256":"29406b21bd722caad7684d4202e031ae81a33a12d6234bc86426d7985f9723f6"},{"id":6,"kind":"allocation_events","start":3567,"end":3606,"offset_unit":"UTF16","source_sha256":"82600c1be2f20d87ea10b1c5dcd3ad845f1079a51afeff65da8fafc9156a30b8"}];
let __ink_work_d3eb7683a9902869_counts=[],__ink_work_d3eb7683a9902869_unknown=[];
function __ink_work_d3eb7683a9902869_hit(i){__ink_work_d3eb7683a9902869_counts[i]=(__ink_work_d3eb7683a9902869_counts[i]??0)+1;}
function __ink_work_d3eb7683a9902869_allocate(i,x){__ink_work_d3eb7683a9902869_hit(i);return x;}
function __ink_work_d3eb7683a9902869_construct(i,x){if(Array.isArray(x)||ArrayBuffer.isView(x)||x instanceof ArrayBuffer){__ink_work_d3eb7683a9902869_hit(i);if(ArrayBuffer.isView(x)&&!__ink_work_d3eb7683a9902869_sites[i].constructor_capacity_only)__ink_work_d3eb7683a9902869_unknown.push({site:i,components:['copy_bytes'],reason:'typed constructor ingress/copy extent not captured'});}else __ink_work_d3eb7683a9902869_unknown.push({site:i,components:['allocation_events'],reason:'constructor allocation behavior unknown'});return x;}
function __ink_work_d3eb7683a9902869_invoke(i,name,receiver,method,args){
 // Invoke the original native operation once. A diagnostic callback records
 // actual visits (including sparse-array skipped entries), preserving original
 // this/arguments and exception order. Opaque custom methods are left alone.
 const proto=Object.getPrototypeOf(receiver);
 const standard=Array.isArray(receiver)?proto===Array.prototype&&method===Array.prototype[name]:(ArrayBuffer.isView(receiver)&&typeof receiver.BYTES_PER_ELEMENT==='number'?method===Object.getPrototypeOf(Uint8Array.prototype)[name]:receiver instanceof ArrayBuffer&&method===ArrayBuffer.prototype[name]);
 if(standard&&(name==='map'||name==='filter')&&typeof args[0]==='function'){const callback=args[0];args[0]=function(...values){__ink_work_d3eb7683a9902869_hit(__ink_work_d3eb7683a9902869_sites[i].callback_site);return Reflect.apply(callback,this,values);};}
 const value=Reflect.apply(method,receiver,args);
 if(!standard){__ink_work_d3eb7683a9902869_unknown.push({site:i,components:['allocation_events','copy_bytes','loop_iterations'],reason:'copy method implementation/carrier unknown'});return value;}
 if(name==='concat')__ink_work_d3eb7683a9902869_unknown.push({site:i,components:['copy_bytes'],reason:'native concat carrier copy bytes unknown'});
 if(name==='set'){
  if(ArrayBuffer.isView(receiver)&&ArrayBuffer.isView(args[0])&&receiver.BYTES_PER_ELEMENT===args[0].BYTES_PER_ELEMENT)__ink_work_d3eb7683a9902869_copy_bytes+=args[0].byteLength;
  else __ink_work_d3eb7683a9902869_unknown.push({site:i,components:['copy_bytes'],reason:'set byte extent or conversion unknown'});
 }else if(Array.isArray(value)||ArrayBuffer.isView(value)||value instanceof ArrayBuffer){
  __ink_work_d3eb7683a9902869_hit(i);
  if(name==='slice'&&(ArrayBuffer.isView(value)||value instanceof ArrayBuffer))__ink_work_d3eb7683a9902869_copy_bytes+=value.byteLength;
  else if(name==='slice')__ink_work_d3eb7683a9902869_unknown.push({site:i,components:['copy_bytes'],reason:'JS Array copy bytes/physical storage unknown'});
 }
 return value;
}
let __ink_work_d3eb7683a9902869_copy_bytes=0;
export function __ink_work_d3eb7683a9902869_reset(){__ink_work_d3eb7683a9902869_counts=[];__ink_work_d3eb7683a9902869_unknown=[];__ink_work_d3eb7683a9902869_copy_bytes=0;}
export function __ink_work_d3eb7683a9902869_snapshot(){return {sites:__ink_work_d3eb7683a9902869_counts.slice(),copy_bytes:__ink_work_d3eb7683a9902869_copy_bytes,unknown:__ink_work_d3eb7683a9902869_unknown.slice()};}
function __fn0(v0,v1,v2,v3){
const v4=v0;
const v5=v4.length;
const v6=__ink_work_d3eb7683a9902869_construct(0,new Array(v5));
for(let v7=0;v7<v5;v7++){__ink_work_d3eb7683a9902869_hit(1);
const v8=v4[v7];
const v9=v8;
const v10=v2;
const v11=v3;
/* inline scan_word */
const v12=v9;
const v13=v11;
/* inline calibrate_word */
const v14=v12;
const v15=v13;
let v16;if(v15===0 ){
v16=0;}else{
v16=(Math.trunc(v14/v15)+0);}
const v17=v16;
const v18=v12;
const v19=(((v17) + (v18)) >>> 0);
const v20=v10;
v6[v7]=(((v19) + (v20)) >>> 0);
}
const v21=v6;
const v22=v21.length;
const v23=v21;
let v24=0;
for(let v25=0;v25<v22;v25++){__ink_work_d3eb7683a9902869_hit(2);
const v26=v21[v25];
v24=(((v24) + (v26)) >>> 0);v23[v25]=v24;}
return v23;}
function __fn1(v27,v28){
const v29=v27;
const v30=v28;
let v31;if(v30===0 ){
v31=0;}else{
v31=(Math.trunc(v29/v30)+0);}
const v32=v31;
const v33=v27;
return (((v32) + (v33)) >>> 0);}
function __fn2(v34,v35,v36){
const v37=v34;
const v38=v36;
/* inline calibrate_word */
const v39=v37;
const v40=v38;
let v41;if(v40===0 ){
v41=0;}else{
v41=(Math.trunc(v39/v40)+0);}
const v42=v41;
const v43=v37;
const v44=(((v42) + (v43)) >>> 0);
const v45=v35;
return (((v44) + (v45)) >>> 0);}
function __into0(v46,v47,v48,v49,v50){
const v51=v46;
const v52=v51.length;
for(let v54=0;v54<v52;v54++){__ink_work_d3eb7683a9902869_hit(3);
const v55=v51[v54];
const v56=v55;
const v57=v48;
const v58=v49;
/* inline scan_word */
const v59=v56;
const v60=v58;
/* inline calibrate_word */
const v61=v59;
const v62=v60;
let v63;if(v62===0 ){
v63=0;}else{
v63=(Math.trunc(v61/v62)+0);}
const v64=v63;
const v65=v59;
const v66=(((v64) + (v65)) >>> 0);
const v67=v57;
v50[v54]=(((v66) + (v67)) >>> 0);
}
let v68=0;
for(let v69=0;v69<v52;v69++){__ink_work_d3eb7683a9902869_hit(4);
const v70=v50[v69];
v68=(((v68) + (v70)) >>> 0);
v50[v69]=v68;
}
return v52;}
const __namedTypes={};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v2","core_sha256":"9f298c812f35832596280ced4ee32d330d5cc33f7ca13616ae96d3ec85bada7f","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":0,"internal":false,"name":"general40_scan_chain","params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"element":{"kind":"u32"},"kind":"list"}},{"destination":null,"index":1,"internal":false,"name":"calibrate_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":2,"internal":false,"name":"scan_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}}],"named_types":{},"schema":1,"state":null};
const __implementations=[__fn0,__fn1,__fn2];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>__ink_work_d3eb7683a9902869_allocate(5,[f.name,__implementations[f.index]]))));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[__into0,null,null];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>__ink_work_d3eb7683a9902869_allocate(6,[f.name,__intoImplementations[f.index]]))));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}
