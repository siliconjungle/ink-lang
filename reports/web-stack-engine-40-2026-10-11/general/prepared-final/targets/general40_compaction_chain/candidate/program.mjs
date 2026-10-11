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
const v17=v15;
let v18=0;
for(let v19=0;v19<v16;v19++){
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
for(let v29=0;v29<v27;v29++){
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
const v64=new Array(v63);
for(let v65=0;v65<v63;v65++){
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
for(let v76=0;v76<v74;v76++){
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
for(let v84=0;v84<v75;v84++){
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
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>[f.name,__implementations[f.index]])));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[__into0,null,null];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>[f.name,__intoImplementations[f.index]])));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}
