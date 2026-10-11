function __fn0(v0,v1,v2,v3){
const v4=v0;
const v5=v4.length;
const v6=new Array(v5);
for(let v7=0;v7<v5;v7++){
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
const v17=[];
for(let v18=0;v18<v16;v18++){
const v19=v15[v18];
const v20=v19;
const v21=16;
let v22;if(v21===0 ){
v22=0;}else{
v22=((v20%v21)+0);}
const v23=v22;
const v24=v2;
if(((v23) < (v24))){v17.push(v19);}
}
const v25=v17;
const v26=v25.length;
const v27=v25;
for(let v28=0;v28<v26;v28++){
const v29=v25[v28];
const v30=v29;
const v31=v2;
const v32=v3;
/* inline repair_word */
const v33=v30;
const v34=v31;
let v35;if(((v33) < (v34))){
const v36=v30;
const v37=v32;
v35=(((v36) + (v37)) >>> 0);}else{
const v38=v30;
const v39=v31;
v35=(((v38) - (v39)) >>> 0);}
v27[v28]=v35;
}
return v27;}
function __fn1(v40,v41){
const v42=v40;
const v43=v41;
const v44=(Math.imul(v42,v43) >>> 0);
const v45=1;
return (((v44) + (v45)) >>> 0);}
function __fn2(v46,v47,v48){
const v49=v46;
const v50=v47;
let v51;if(((v49) < (v50))){
const v52=v46;
const v53=v48;
v51=(((v52) + (v53)) >>> 0);}else{
const v54=v46;
const v55=v47;
v51=(((v54) - (v55)) >>> 0);}
return v51;}
function __into0(v56,v57,v58,v59,v60){
const v61=v56;
const v62=v61.length;
const v63=new Array(v62);
for(let v64=0;v64<v62;v64++){
const v65=v61[v64];
const v66=v65;
const v67=v59;
/* inline stage_word */
const v68=v66;
const v69=v67;
const v70=(Math.imul(v68,v69) >>> 0);
const v71=1;
v63[v64]=(((v70) + (v71)) >>> 0);
}
const v72=v63;
const v73=v72.length;
let v74=0;
for(let v75=0;v75<v73;v75++){
const v76=v72[v75];
const v77=v76;
const v78=16;
let v79;if(v78===0 ){
v79=0;}else{
v79=((v77%v78)+0);}
const v80=v79;
const v81=v58;
if(((v80) < (v81))){
v60[v74++]=v76;
}
}
for(let v83=0;v83<v74;v83++){
const v84=v60[v83];
const v85=v84;
const v86=v58;
const v87=v59;
/* inline repair_word */
const v88=v85;
const v89=v86;
let v90;if(((v88) < (v89))){
const v91=v85;
const v92=v87;
v90=(((v91) + (v92)) >>> 0);}else{
const v93=v85;
const v94=v86;
v90=(((v93) - (v94)) >>> 0);}
v60[v83]=v90;
}
return v74;}
const __namedTypes={};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v2","core_sha256":"64dd049276e1ad273df0cbbe6a1ec9141b5267d6ea961864f7b06900087d52bd","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":0,"internal":false,"name":"general40_compaction_chain","params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"element":{"kind":"u32"},"kind":"list"}},{"destination":null,"index":1,"internal":false,"name":"stage_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":2,"internal":false,"name":"repair_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}}],"named_types":{},"schema":1,"state":null};
const __implementations=[__fn0,__fn1,__fn2];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>[f.name,__implementations[f.index]])));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[__into0,null,null];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>[f.name,__intoImplementations[f.index]])));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}
