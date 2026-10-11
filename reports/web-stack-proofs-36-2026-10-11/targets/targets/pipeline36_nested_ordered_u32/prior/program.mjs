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
const v20=v19.length;
const v21=new Array(v20);
for(let v22=0;v22<v20;v22++){
const v23=v19[v22];
const v24=v23;
const v25=v2;
const v26=v3;
/* inline post_word */
const v27=v24;
const v28=v25;
const v29=v26;
/* inline repair_word */
const v30=v27;
const v31=v28;
let v32;if(((v30) < (v31))){
const v33=v27;
const v34=v29;
v32=(((v33) + (v34)) >>> 0);}else{
const v35=v27;
const v36=v29;
v32=(((v35) - (v36)) >>> 0);}
v21[v22]=v32;
}
const v37=v21;
let v38=v2;
for(let v39=v37.length-1;v39>=0;v39--){
const v40=v37[v39];
const v41=v40;
const v42=v38;
const v43=v2;
const v44=v3;
/* inline reduce_word */
const v45=v41;
const v46=v42;
const v47=v43;
const v48=v44;
/* inline mix_word */
const v49=v46;
const v50=v47;
let v51;if(((v49) < (v50))){
const v52=v45;
const v53=v46;
const v54=v48;
const v55=(Math.imul(v53,v54) >>> 0);
v51=(((v52) + (v55)) >>> 0);}else{
const v56=v45;
const v57=v46;
v51=(((v56) - (v57)) >>> 0);}
v38=v51;
}
return v38;}
function __fn1(v58,v59,v60){
const v61=v58;
const v62=v60;
/* inline calibrate_left */
const v63=v61;
const v64=v62;
let v65;if(v64===0 ){
v65=0;}else{
v65=(Math.trunc(v63/v64)+0);}
const v66=v65;
const v67=v59;
return (((v66) + (v67)) >>> 0);}
function __fn2(v68,v69){
const v70=v68;
const v71=v69;
let v72;if(v71===0 ){
v72=0;}else{
v72=(Math.trunc(v70/v71)+0);}
return v72;}
function __fn3(v73,v74,v75){
const v76=v73;
const v77=v75;
/* inline calibrate_right */
const v78=v76;
const v79=v77;
let v80;if(v79===0 ){
v80=0;}else{
v80=((v78%v79)+0);}
const v81=v80;
const v82=v75;
return (((v81) + (v82)) >>> 0);}
function __fn4(v83,v84){
const v85=v83;
const v86=v84;
let v87;if(v86===0 ){
v87=0;}else{
v87=((v85%v86)+0);}
return v87;}
function __fn5(v88,v89,v90,v91){
const v92=v88;
const v93=v89;
const v94=v90;
const v95=v91;
/* inline mix_word */
const v96=v93;
const v97=v94;
let v98;if(((v96) < (v97))){
const v99=v92;
const v100=v93;
const v101=v95;
const v102=(Math.imul(v100,v101) >>> 0);
v98=(((v99) + (v102)) >>> 0);}else{
const v103=v92;
const v104=v93;
v98=(((v103) - (v104)) >>> 0);}
return v98;}
function __fn6(v105,v106,v107,v108){
const v109=v106;
const v110=v107;
let v111;if(((v109) < (v110))){
const v112=v105;
const v113=v106;
const v114=v108;
const v115=(Math.imul(v113,v114) >>> 0);
v111=(((v112) + (v115)) >>> 0);}else{
const v116=v105;
const v117=v106;
v111=(((v116) - (v117)) >>> 0);}
return v111;}
function __fn7(v118,v119,v120){
const v121=v118;
const v122=v119;
const v123=v120;
/* inline repair_word */
const v124=v121;
const v125=v122;
let v126;if(((v124) < (v125))){
const v127=v121;
const v128=v123;
v126=(((v127) + (v128)) >>> 0);}else{
const v129=v121;
const v130=v123;
v126=(((v129) - (v130)) >>> 0);}
return v126;}
function __fn8(v131,v132,v133){
const v134=v131;
const v135=v132;
let v136;if(((v134) < (v135))){
const v137=v131;
const v138=v133;
v136=(((v137) + (v138)) >>> 0);}else{
const v139=v131;
const v140=v133;
v136=(((v139) - (v140)) >>> 0);}
return v136;}
const __namedTypes={};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v2","core_sha256":"793245f86efb82aa59aa59b86144f057d03881f9282bd5621e82e1a3bd77d1c4","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":null,"index":0,"internal":false,"name":"pipeline36_nested_ordered_u32","params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":1,"internal":false,"name":"left_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":2,"internal":false,"name":"calibrate_left","params":[{"name":"x","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":3,"internal":false,"name":"right_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":4,"internal":false,"name":"calibrate_right","params":[{"name":"x","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":5,"internal":false,"name":"reduce_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"acc","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":6,"internal":false,"name":"mix_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"acc","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":7,"internal":false,"name":"post_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":8,"internal":false,"name":"repair_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}}],"named_types":{},"schema":1,"state":null};
const __implementations=[__fn0,__fn1,__fn2,__fn3,__fn4,__fn5,__fn6,__fn7,__fn8];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>[f.name,__implementations[f.index]])));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[null,null,null,null,null,null,null,null,null];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>[f.name,__intoImplementations[f.index]])));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}
