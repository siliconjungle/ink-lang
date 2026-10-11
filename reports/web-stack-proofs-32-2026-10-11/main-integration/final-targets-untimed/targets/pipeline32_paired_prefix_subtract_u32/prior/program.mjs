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
const v23=(((v21) - (v22)) >>> 0);
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
v17[v18]=v28;
}
return v17;}
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
const v49=new Array(v48.length);
let v50=0;
for(let v51=0;v51<v48.length;v51++){
const v52=v48[v51];
v50=(((v50) + (v52)) >>> 0);v49[v51]=v50;}
const v53=v49;
const v54=v44;
const v55=new Array(v54.length);
let v56=0;
for(let v57=0;v57<v54.length;v57++){
const v58=v54[v57];
v56=(((v56) + (v58)) >>> 0);v55[v57]=v56;}
const v59=v55;
const v60=Math.min(v53.length,v59.length);
for(let v62=0;v62<v60;v62++){
const v63=v53[v62];
const v64=v59[v62];
const v65=v63;
const v66=v64;
const v67=(((v65) - (v66)) >>> 0);
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
v47[v62]=v72;
}
return v60;}
const __namedTypes={};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v2","core_sha256":"ededde2c3486c0d380024ef419aeaec1dee04c0b1560824122fbe00c2b5de2f9","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":0,"internal":false,"name":"pipeline32_paired_prefix_subtract_u32","params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"element":{"kind":"u32"},"kind":"list"}},{"destination":null,"index":1,"internal":false,"name":"output_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}}],"named_types":{},"schema":1,"state":null};
const __implementations=[__fn0,__fn1];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>[f.name,__implementations[f.index]])));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[__into0,null];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>[f.name,__intoImplementations[f.index]])));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}
