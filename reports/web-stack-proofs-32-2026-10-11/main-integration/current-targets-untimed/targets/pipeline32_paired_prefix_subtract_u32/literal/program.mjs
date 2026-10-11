function __fn0(v0,v1,v2,v3){
const v4=v0;
const v5=new Array(v4.length);
let v6=0;
for(let v7=0;v7<v4.length;v7++){
const v8=v4[v7];
v6=(((v6) + (v8)) >>> 0);v5[v7]=v6;}
const v9=v5;
const v10=v1;
const v11=new Array(v10.length);
let v12=0;
for(let v13=0;v13<v10.length;v13++){
const v14=v10[v13];
v12=(((v12) + (v14)) >>> 0);v11[v13]=v12;}
const v15=v11;
const v16=Math.min(v9.length,v15.length);
const v17=new Array(v16);
for(let v18=0;v18<v16;v18++){
const v19=v9[v18];
const v20=v15[v18];
const v21=v19;
const v22=v20;
v17[v18]=(((v21) - (v22)) >>> 0);
}
const v23=v17;
const v24=v23.length;
const v25=new Array(v24);
for(let v26=0;v26<v24;v26++){
const v27=v23[v26];
const v28=v27;
const v29=v2;
const v30=v3;
/* inline output_word */
const v31=v28;
const v32=v29;
let v33;if(((v31) < (v32))){
const v34=v28;
const v35=v30;
v33=(((v34) + (v35)) >>> 0);}else{
const v36=v28;
const v37=v30;
v33=(((v36) - (v37)) >>> 0);}
v25[v26]=v33;
}
return v25;}
function __fn1(v38,v39,v40){
const v41=v38;
const v42=v39;
let v43;if(((v41) < (v42))){
const v44=v38;
const v45=v40;
v43=(((v44) + (v45)) >>> 0);}else{
const v46=v38;
const v47=v40;
v43=(((v46) - (v47)) >>> 0);}
return v43;}
function __into0(v48,v49,v50,v51,v52){
const v53=v48;
const v54=new Array(v53.length);
let v55=0;
for(let v56=0;v56<v53.length;v56++){
const v57=v53[v56];
v55=(((v55) + (v57)) >>> 0);v54[v56]=v55;}
const v58=v54;
const v59=v49;
const v60=new Array(v59.length);
let v61=0;
for(let v62=0;v62<v59.length;v62++){
const v63=v59[v62];
v61=(((v61) + (v63)) >>> 0);v60[v62]=v61;}
const v64=v60;
const v65=Math.min(v58.length,v64.length);
const v66=new Array(v65);
for(let v67=0;v67<v65;v67++){
const v68=v58[v67];
const v69=v64[v67];
const v70=v68;
const v71=v69;
v66[v67]=(((v70) - (v71)) >>> 0);
}
const v72=v66;
const v73=v72.length;
for(let v75=0;v75<v73;v75++){
const v76=v72[v75];
const v77=v76;
const v78=v50;
const v79=v51;
/* inline output_word */
const v80=v77;
const v81=v78;
let v82;if(((v80) < (v81))){
const v83=v77;
const v84=v79;
v82=(((v83) + (v84)) >>> 0);}else{
const v85=v77;
const v86=v79;
v82=(((v85) - (v86)) >>> 0);}
v52[v75]=v82;
}
return v73;}
const __namedTypes={};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v2","core_sha256":"89ffd08ef2240c3a50fe7b80f1820971dcfbe203504a788097e09468d89f99ad","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":0,"internal":false,"name":"pipeline32_paired_prefix_subtract_u32","params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"element":{"kind":"u32"},"kind":"list"}},{"destination":null,"index":1,"internal":false,"name":"output_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}}],"named_types":{},"schema":1,"state":null};
const __implementations=[__fn0,__fn1];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>[f.name,__implementations[f.index]])));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[__into0,null];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>[f.name,__intoImplementations[f.index]])));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}
