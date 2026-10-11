
const __ink_work_0af1e087211e38e6_sites=[{"id":0,"kind":"construction","start":71,"end":84,"offset_unit":"UTF16","source_sha256":"ff384c108acfaa7bca572e56e861d8ad1ed407f05d6c13fdedf3b681791c82a1","constructor_capacity_only":false},{"id":1,"kind":"loop_iterations","start":86,"end":293,"offset_unit":"UTF16","source_sha256":"77c4c9023ba78116150aee6392034efd6cb580dbe4ba52d45cef5bb91b428a71"},{"id":2,"kind":"loop_iterations","start":356,"end":557,"offset_unit":"UTF16","source_sha256":"dd94dc9a61834eb50fcd73d0e605a7ab695672ee10073907e6845b3e8024eb0e"},{"id":3,"kind":"loop_iterations","start":626,"end":943,"offset_unit":"UTF16","source_sha256":"1153509a66034442c1a572724e6b42bccdac4ba02b466988d465c3d985b988b5"},{"id":4,"kind":"construction","start":1408,"end":1422,"offset_unit":"UTF16","source_sha256":"04638175b0c856ef4e0dd6c5b7f308c4d0a82c5b97919207dab377a8b570d67a","constructor_capacity_only":false},{"id":5,"kind":"loop_iterations","start":1424,"end":1644,"offset_unit":"UTF16","source_sha256":"67e3e1938bae30799f704016d12d8ac4518cccfe55e06a0878a15f7f9cf29c25"},{"id":6,"kind":"loop_iterations","start":1693,"end":1897,"offset_unit":"UTF16","source_sha256":"01de8dca3af95c449f0efc017c14927c21526f7260db516add5ccc71dfcecf8c"},{"id":7,"kind":"loop_iterations","start":1898,"end":2217,"offset_unit":"UTF16","source_sha256":"3d4869486e1482a274d195d80953ae149ef3c3ed09a203723e8528e1ec49cc8c"},{"id":8,"kind":"allocation_events","start":3824,"end":3859,"offset_unit":"UTF16","source_sha256":"29406b21bd722caad7684d4202e031ae81a33a12d6234bc86426d7985f9723f6"},{"id":9,"kind":"allocation_events","start":4115,"end":4154,"offset_unit":"UTF16","source_sha256":"82600c1be2f20d87ea10b1c5dcd3ad845f1079a51afeff65da8fafc9156a30b8"}];
let __ink_work_0af1e087211e38e6_counts=[],__ink_work_0af1e087211e38e6_unknown=[];
function __ink_work_0af1e087211e38e6_hit(i){__ink_work_0af1e087211e38e6_counts[i]=(__ink_work_0af1e087211e38e6_counts[i]??0)+1;}
function __ink_work_0af1e087211e38e6_allocate(i,x){__ink_work_0af1e087211e38e6_hit(i);return x;}
function __ink_work_0af1e087211e38e6_construct(i,x){if(Array.isArray(x)||ArrayBuffer.isView(x)||x instanceof ArrayBuffer){__ink_work_0af1e087211e38e6_hit(i);if(ArrayBuffer.isView(x)&&!__ink_work_0af1e087211e38e6_sites[i].constructor_capacity_only)__ink_work_0af1e087211e38e6_unknown.push({site:i,components:['copy_bytes'],reason:'typed constructor ingress/copy extent not captured'});}else __ink_work_0af1e087211e38e6_unknown.push({site:i,components:['allocation_events'],reason:'constructor allocation behavior unknown'});return x;}
function __ink_work_0af1e087211e38e6_invoke(i,name,receiver,method,args){
 // Invoke the original native operation once. A diagnostic callback records
 // actual visits (including sparse-array skipped entries), preserving original
 // this/arguments and exception order. Opaque custom methods are left alone.
 const proto=Object.getPrototypeOf(receiver);
 const standard=Array.isArray(receiver)?proto===Array.prototype&&method===Array.prototype[name]:(ArrayBuffer.isView(receiver)&&typeof receiver.BYTES_PER_ELEMENT==='number'?method===Object.getPrototypeOf(Uint8Array.prototype)[name]:receiver instanceof ArrayBuffer&&method===ArrayBuffer.prototype[name]);
 if(standard&&(name==='map'||name==='filter')&&typeof args[0]==='function'){const callback=args[0];args[0]=function(...values){__ink_work_0af1e087211e38e6_hit(__ink_work_0af1e087211e38e6_sites[i].callback_site);return Reflect.apply(callback,this,values);};}
 const value=Reflect.apply(method,receiver,args);
 if(!standard){__ink_work_0af1e087211e38e6_unknown.push({site:i,components:['allocation_events','copy_bytes','loop_iterations'],reason:'copy method implementation/carrier unknown'});return value;}
 if(name==='concat')__ink_work_0af1e087211e38e6_unknown.push({site:i,components:['copy_bytes'],reason:'native concat carrier copy bytes unknown'});
 if(name==='set'){
  if(ArrayBuffer.isView(receiver)&&ArrayBuffer.isView(args[0])&&receiver.BYTES_PER_ELEMENT===args[0].BYTES_PER_ELEMENT)__ink_work_0af1e087211e38e6_copy_bytes+=args[0].byteLength;
  else __ink_work_0af1e087211e38e6_unknown.push({site:i,components:['copy_bytes'],reason:'set byte extent or conversion unknown'});
 }else if(Array.isArray(value)||ArrayBuffer.isView(value)||value instanceof ArrayBuffer){
  __ink_work_0af1e087211e38e6_hit(i);
  if(name==='slice'&&(ArrayBuffer.isView(value)||value instanceof ArrayBuffer))__ink_work_0af1e087211e38e6_copy_bytes+=value.byteLength;
  else if(name==='slice')__ink_work_0af1e087211e38e6_unknown.push({site:i,components:['copy_bytes'],reason:'JS Array copy bytes/physical storage unknown'});
 }
 return value;
}
let __ink_work_0af1e087211e38e6_copy_bytes=0;
export function __ink_work_0af1e087211e38e6_reset(){__ink_work_0af1e087211e38e6_counts=[];__ink_work_0af1e087211e38e6_unknown=[];__ink_work_0af1e087211e38e6_copy_bytes=0;}
export function __ink_work_0af1e087211e38e6_snapshot(){return {sites:__ink_work_0af1e087211e38e6_counts.slice(),copy_bytes:__ink_work_0af1e087211e38e6_copy_bytes,unknown:__ink_work_0af1e087211e38e6_unknown.slice()};}
function __fn0(v0,v1,v2,v3){
const v4=v0;
const v5=v4.length;
const v6=__ink_work_0af1e087211e38e6_construct(0,new Array(v5));
for(let v7=0;v7<v5;v7++){__ink_work_0af1e087211e38e6_hit(1);
const v8=v4[v7];
const v9=v8;
const v10=v3;
/* inline stage_word */
const v11=v9;
const v12=v10;
const v13=(Math.imul(v11,v12) >>> 0);
const v14=1;
v6[v7]=(((v13) + (v14)) >>> 0);
}
const v15=v6;
const v16=v15.length;
const v17=v15;
let v18=0;
for(let v19=0;v19<v16;v19++){__ink_work_0af1e087211e38e6_hit(2);
const v20=v15[v19];
const v21=v20;
const v22=16;
let v23;if(v22===0 ){
v23=0;}else{
v23=((v21%v22)+0);}
const v24=v23;
const v25=v2;
if(((v24) < (v25))){v17[v18++]=v20;}
}
v17.length=v18;
const v26=v17;
const v27=v26.length;
const v28=v26;
for(let v29=0;v29<v27;v29++){__ink_work_0af1e087211e38e6_hit(3);
const v30=v26[v29];
const v31=v30;
const v32=v2;
const v33=v3;
/* inline repair_word */
const v34=v31;
const v35=v32;
let v36;if(((v34) < (v35))){
const v37=v31;
const v38=v33;
v36=(((v37) + (v38)) >>> 0);}else{
const v39=v31;
const v40=v32;
v36=(((v39) - (v40)) >>> 0);}
v28[v29]=v36;
}
return v28;}
function __fn1(v41,v42){
const v43=v41;
const v44=v42;
const v45=(Math.imul(v43,v44) >>> 0);
const v46=1;
return (((v45) + (v46)) >>> 0);}
function __fn2(v47,v48,v49){
const v50=v47;
const v51=v48;
let v52;if(((v50) < (v51))){
const v53=v47;
const v54=v49;
v52=(((v53) + (v54)) >>> 0);}else{
const v55=v47;
const v56=v48;
v52=(((v55) - (v56)) >>> 0);}
return v52;}
function __into0(v57,v58,v59,v60,v61){
const v62=v57;
const v63=v62.length;
const v64=__ink_work_0af1e087211e38e6_construct(4,new Array(v63));
for(let v65=0;v65<v63;v65++){__ink_work_0af1e087211e38e6_hit(5);
const v66=v62[v65];
const v67=v66;
const v68=v60;
/* inline stage_word */
const v69=v67;
const v70=v68;
const v71=(Math.imul(v69,v70) >>> 0);
const v72=1;
v64[v65]=(((v71) + (v72)) >>> 0);
}
const v73=v64;
const v74=v73.length;
let v75=0;
for(let v76=0;v76<v74;v76++){__ink_work_0af1e087211e38e6_hit(6);
const v77=v73[v76];
const v78=v77;
const v79=16;
let v80;if(v79===0 ){
v80=0;}else{
v80=((v78%v79)+0);}
const v81=v80;
const v82=v59;
if(((v81) < (v82))){
v61[v75++]=v77;
}
}
for(let v84=0;v84<v75;v84++){__ink_work_0af1e087211e38e6_hit(7);
const v85=v61[v84];
const v86=v85;
const v87=v59;
const v88=v60;
/* inline repair_word */
const v89=v86;
const v90=v87;
let v91;if(((v89) < (v90))){
const v92=v86;
const v93=v88;
v91=(((v92) + (v93)) >>> 0);}else{
const v94=v86;
const v95=v87;
v91=(((v94) - (v95)) >>> 0);}
v61[v84]=v91;
}
return v75;}
const __namedTypes={};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v2","core_sha256":"64dd049276e1ad273df0cbbe6a1ec9141b5267d6ea961864f7b06900087d52bd","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":0,"internal":false,"name":"general40_compaction_chain","params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"element":{"kind":"u32"},"kind":"list"}},{"destination":null,"index":1,"internal":false,"name":"stage_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":2,"internal":false,"name":"repair_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}}],"named_types":{},"schema":1,"state":null};
const __implementations=[__fn0,__fn1,__fn2];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>__ink_work_0af1e087211e38e6_allocate(8,[f.name,__implementations[f.index]]))));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[__into0,null,null];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>__ink_work_0af1e087211e38e6_allocate(9,[f.name,__intoImplementations[f.index]]))));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}
