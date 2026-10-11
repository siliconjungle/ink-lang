function __fn0(v0,v1,v2,v3){
const v4=v0;
const v5=v1;
const v6=Math.min(v4.length,v5.length);
const v7=new Array(v6);
for(let v8=0;v8<v6;v8++){
const v9=v4[v8];
const v10=v5[v8];
const v11=v9;
const v12=v10;
v7[v8]=(((v11) - (v12)) >>> 0);
}
const v13=v7;
const v14=new Array(v13.length);
let v15=0;
for(let v16=0;v16<v13.length;v16++){
const v17=v13[v16];
v15=(((v15) + (v17)) >>> 0);v14[v16]=v15;}
const v18=v14;
const v19=v18.length;
const v20=new Array(v19);
for(let v21=0;v21<v19;v21++){
const v22=v18[v21];
const v23=v22;
const v24=v2;
const v25=v3;
/* inline output_word */
const v26=v23;
const v27=v24;
let v28;if(((v26) < (v27))){
const v29=v23;
const v30=v25;
v28=(((v29) + (v30)) >>> 0);}else{
const v31=v23;
const v32=v25;
v28=(((v31) - (v32)) >>> 0);}
v20[v21]=v28;
}
return v20;}
function __fn1(v33,v34,v35){
const v36=v33;
const v37=v34;
let v38;if(((v36) < (v37))){
const v39=v33;
const v40=v35;
v38=(((v39) + (v40)) >>> 0);}else{
const v41=v33;
const v42=v35;
v38=(((v41) - (v42)) >>> 0);}
return v38;}
function __into0(v43,v44,v45,v46,v47){
const v48=v43;
const v49=v44;
const v50=Math.min(v48.length,v49.length);
const v51=new Array(v50);
for(let v52=0;v52<v50;v52++){
const v53=v48[v52];
const v54=v49[v52];
const v55=v53;
const v56=v54;
v51[v52]=(((v55) - (v56)) >>> 0);
}
const v57=v51;
const v58=new Array(v57.length);
let v59=0;
for(let v60=0;v60<v57.length;v60++){
const v61=v57[v60];
v59=(((v59) + (v61)) >>> 0);v58[v60]=v59;}
const v62=v58;
const v63=v62.length;
for(let v65=0;v65<v63;v65++){
const v66=v62[v65];
const v67=v66;
const v68=v45;
const v69=v46;
/* inline output_word */
const v70=v67;
const v71=v68;
let v72;if(((v70) < (v71))){
const v73=v67;
const v74=v69;
v72=(((v73) + (v74)) >>> 0);}else{
const v75=v67;
const v76=v69;
v72=(((v75) - (v76)) >>> 0);}
v47[v65]=v72;
}
return v63;}
const __namedTypes={};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v2","core_sha256":"6ca4828e469dc47d5b43e2727a9e5b590b0089450ac4522dc50a47cd69abb1e6","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":0,"internal":false,"name":"pipeline32_paired_prefix_subtract_u32","params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"element":{"kind":"u32"},"kind":"list"}},{"destination":null,"index":1,"internal":false,"name":"output_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}}],"named_types":{},"schema":1,"state":null};
const __implementations=[__fn0,__fn1];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>[f.name,__implementations[f.index]])));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[__into0,null];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>[f.name,__intoImplementations[f.index]])));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}
