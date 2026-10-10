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
let v14;if(v13===0 ){
v14=0;}else{
v14=(Math.trunc(v12/v13)+0);}
const v15=v14;
const v16=v10;
v6[v7]=(((v15) + (v16)) >>> 0);
}
const v17=v6;
const v18=new Array(v17.length);
let v19=0;
for(let v20=0;v20<v17.length;v20++){
const v21=v17[v20];
v19=(((v19) + (v21)) >>> 0);v18[v20]=v19;}
const v22=v18;
const v23=v1;
const v24=v23.length;
const v25=new Array(v24);
for(let v26=0;v26<v24;v26++){
const v27=v23[v26];
const v28=v27;
const v29=v2;
const v30=v3;
/* inline right_word */
const v31=v28;
const v32=v30;
let v33;if(v32===0 ){
v33=0;}else{
v33=((v31%v32)+0);}
const v34=v33;
const v35=v30;
v25[v26]=(((v34) + (v35)) >>> 0);
}
const v36=v25;
const v37=new Array(v36.length);
let v38=0;
for(let v39=0;v39<v36.length;v39++){
const v40=v36[v39];
v38=(((v38) + (v40)) >>> 0);v37[v39]=v38;}
const v41=v37;
const v42=Math.min(v22.length,v41.length);
const v43=new Array(v42);
for(let v44=0;v44<v42;v44++){
const v45=v22[v44];
const v46=v41[v44];
const v47=v45;
const v48=v46;
const v49=(((v47) + (v48)) >>> 0);
const v50=v2;
const v51=v3;
/* inline output_word */
const v52=v49;
const v53=v50;
let v54;if(((v52) < (v53))){
const v55=v49;
const v56=v51;
v54=(((v55) + (v56)) >>> 0);}else{
const v57=v49;
const v58=v51;
v54=(((v57) - (v58)) >>> 0);}
v43[v44]=v54;
}
return v43;}
function __fn1(v59,v60,v61){
const v62=v59;
const v63=v60;
let v64;if(((v62) < (v63))){
const v65=v59;
const v66=v61;
v64=(((v65) + (v66)) >>> 0);}else{
const v67=v59;
const v68=v61;
v64=(((v67) - (v68)) >>> 0);}
return v64;}
function __fn2(v69,v70,v71){
const v72=v69;
const v73=v71;
let v74;if(v73===0 ){
v74=0;}else{
v74=(Math.trunc(v72/v73)+0);}
const v75=v74;
const v76=v70;
return (((v75) + (v76)) >>> 0);}
function __fn3(v77,v78,v79){
const v80=v77;
const v81=v79;
let v82;if(v81===0 ){
v82=0;}else{
v82=((v80%v81)+0);}
const v83=v82;
const v84=v79;
return (((v83) + (v84)) >>> 0);}
function __into0(v85,v86,v87,v88,v89){
const v90=v85;
const v91=v90.length;
const v92=new Array(v91);
for(let v93=0;v93<v91;v93++){
const v94=v90[v93];
const v95=v94;
const v96=v87;
const v97=v88;
/* inline left_word */
const v98=v95;
const v99=v97;
let v100;if(v99===0 ){
v100=0;}else{
v100=(Math.trunc(v98/v99)+0);}
const v101=v100;
const v102=v96;
v92[v93]=(((v101) + (v102)) >>> 0);
}
const v103=v92;
const v104=new Array(v103.length);
let v105=0;
for(let v106=0;v106<v103.length;v106++){
const v107=v103[v106];
v105=(((v105) + (v107)) >>> 0);v104[v106]=v105;}
const v108=v104;
const v109=v86;
const v110=v109.length;
const v111=new Array(v110);
for(let v112=0;v112<v110;v112++){
const v113=v109[v112];
const v114=v113;
const v115=v87;
const v116=v88;
/* inline right_word */
const v117=v114;
const v118=v116;
let v119;if(v118===0 ){
v119=0;}else{
v119=((v117%v118)+0);}
const v120=v119;
const v121=v116;
v111[v112]=(((v120) + (v121)) >>> 0);
}
const v122=v111;
const v123=new Array(v122.length);
let v124=0;
for(let v125=0;v125<v122.length;v125++){
const v126=v122[v125];
v124=(((v124) + (v126)) >>> 0);v123[v125]=v124;}
const v127=v123;
const v128=Math.min(v108.length,v127.length);
for(let v130=0;v130<v128;v130++){
const v131=v108[v130];
const v132=v127[v130];
const v133=v131;
const v134=v132;
const v135=(((v133) + (v134)) >>> 0);
const v136=v87;
const v137=v88;
/* inline output_word */
const v138=v135;
const v139=v136;
let v140;if(((v138) < (v139))){
const v141=v135;
const v142=v137;
v140=(((v141) + (v142)) >>> 0);}else{
const v143=v135;
const v144=v137;
v140=(((v143) - (v144)) >>> 0);}
v89[v130]=v140;
}
return v128;}
const __namedTypes={};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v2","core_sha256":"e0ff3afd1a60b4a0312a0bfe748c2ebbc494cacd39fac869df3f73aeda1552d2","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":0,"internal":false,"name":"pipeline32_paired_prefix_add_heldout_u32","params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"element":{"kind":"u32"},"kind":"list"}},{"destination":null,"index":1,"internal":false,"name":"output_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":2,"internal":false,"name":"left_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":3,"internal":false,"name":"right_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}}],"named_types":{},"schema":1,"state":null};
const __implementations=[__fn0,__fn1,__fn2,__fn3];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>[f.name,__implementations[f.index]])));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[__into0,null,null,null];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>[f.name,__intoImplementations[f.index]])));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}
