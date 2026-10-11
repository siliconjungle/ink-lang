function __fn0(v0,v1,v2,v3){
const v4=v0;
const v5=v4.length;
const v6=new Array(v5);
for(let v7=0;v7<v5;v7++){
const v8=v4[v7];
const v9=v8;
const v10=v2;
const v11=v3;
/* inline left_word */
const v12=v9;
const v13=v11;
/* inline calibrate_left */
const v14=v12;
const v15=v13;
let v16;if(v15===0 ){
v16=0;}else{
v16=(Math.trunc(v14/v15)+0);}
const v17=v16;
const v18=v10;
v6[v7]=(((v17) + (v18)) >>> 0);
}
const v19=v6;
const v20=v1;
const v21=v20.length;
const v22=new Array(v21);
for(let v23=0;v23<v21;v23++){
const v24=v20[v23];
const v25=v24;
const v26=v2;
const v27=v3;
/* inline right_word */
const v28=v25;
const v29=v27;
/* inline calibrate_right */
const v30=v28;
const v31=v29;
let v32;if(v31===0 ){
v32=0;}else{
v32=((v30%v31)+0);}
const v33=v32;
const v34=v27;
v22[v23]=(((v33) + (v34)) >>> 0);
}
const v35=v22;
const v36=v19.length;
const v37=v35.length;
const v38=new Array(v36+v37);
for(let v39=0;v39<v36;v39++){v38[v39]=v19[v39];}
for(let v40=0;v40<v37;v40++){v38[v36+v40]=v35[v40];}
const v41=v38;
let v42=v2;
for(let v43=v41.length-1;v43>=0;v43--){
const v44=v41[v43];
const v45=v44;
const v46=v42;
const v47=v2;
const v48=v3;
/* inline reduce_word */
const v49=v45;
const v50=v46;
const v51=v47;
const v52=v48;
/* inline mix_word */
const v53=v50;
const v54=v51;
let v55;if(((v53) < (v54))){
const v56=v49;
const v57=v50;
const v58=v52;
const v59=(Math.imul(v57,v58) >>> 0);
v55=(((v56) + (v59)) >>> 0);}else{
const v60=v49;
const v61=v50;
v55=(((v60) - (v61)) >>> 0);}
v42=v55;
}
return v42;}
function __fn1(v62,v63,v64){
const v65=v62;
const v66=v64;
/* inline calibrate_left */
const v67=v65;
const v68=v66;
let v69;if(v68===0 ){
v69=0;}else{
v69=(Math.trunc(v67/v68)+0);}
const v70=v69;
const v71=v63;
return (((v70) + (v71)) >>> 0);}
function __fn2(v72,v73){
const v74=v72;
const v75=v73;
let v76;if(v75===0 ){
v76=0;}else{
v76=(Math.trunc(v74/v75)+0);}
return v76;}
function __fn3(v77,v78,v79){
const v80=v77;
const v81=v79;
/* inline calibrate_right */
const v82=v80;
const v83=v81;
let v84;if(v83===0 ){
v84=0;}else{
v84=((v82%v83)+0);}
const v85=v84;
const v86=v79;
return (((v85) + (v86)) >>> 0);}
function __fn4(v87,v88){
const v89=v87;
const v90=v88;
let v91;if(v90===0 ){
v91=0;}else{
v91=((v89%v90)+0);}
return v91;}
function __fn5(v92,v93,v94,v95){
const v96=v92;
const v97=v93;
const v98=v94;
const v99=v95;
/* inline mix_word */
const v100=v97;
const v101=v98;
let v102;if(((v100) < (v101))){
const v103=v96;
const v104=v97;
const v105=v99;
const v106=(Math.imul(v104,v105) >>> 0);
v102=(((v103) + (v106)) >>> 0);}else{
const v107=v96;
const v108=v97;
v102=(((v107) - (v108)) >>> 0);}
return v102;}
function __fn6(v109,v110,v111,v112){
const v113=v110;
const v114=v111;
let v115;if(((v113) < (v114))){
const v116=v109;
const v117=v110;
const v118=v112;
const v119=(Math.imul(v117,v118) >>> 0);
v115=(((v116) + (v119)) >>> 0);}else{
const v120=v109;
const v121=v110;
v115=(((v120) - (v121)) >>> 0);}
return v115;}
const __namedTypes={};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v4","core_sha256":"4f7308ac33ebb38b2c79befe621bb8e4050b94c228c7c7b73189ae983007e050","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":null,"index":0,"internal":false,"name":"pipeline36_concat_ordered_heldout_u32","params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":1,"internal":false,"name":"left_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":2,"internal":false,"name":"calibrate_left","params":[{"name":"x","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":3,"internal":false,"name":"right_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":4,"internal":false,"name":"calibrate_right","params":[{"name":"x","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":5,"internal":false,"name":"reduce_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"acc","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":6,"internal":false,"name":"mix_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"acc","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}}],"named_types":{},"schema":1,"state":null};
const __implementations=[__fn0,__fn1,__fn2,__fn3,__fn4,__fn5,__fn6];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>[f.name,__implementations[f.index]])));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[null,null,null,null,null,null,null];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>[f.name,__intoImplementations[f.index]])));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}
