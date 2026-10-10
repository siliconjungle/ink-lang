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
const v18=v1;
const v19=v18.length;
const v20=new Array(v19);
for(let v21=0;v21<v19;v21++){
const v22=v18[v21];
const v23=v22;
const v24=v2;
const v25=v3;
/* inline right_word */
const v26=v23;
const v27=v25;
let v28;if(v27===0 ){
v28=0;}else{
v28=((v26%v27)+0);}
const v29=v28;
const v30=v25;
v20[v21]=(((v29) + (v30)) >>> 0);
}
const v31=v20;
const v32=Math.min(v17.length,v31.length);
const v33=new Array(v32);
for(let v34=0;v34<v32;v34++){
const v35=v17[v34];
const v36=v31[v34];
const v37=v35;
const v38=v36;
v33[v34]=(((v37) + (v38)) >>> 0);
}
const v39=v33;
const v40=new Array(v39.length);
let v41=0;
for(let v42=0;v42<v39.length;v42++){
const v43=v39[v42];
v41=(((v41) + (v43)) >>> 0);v40[v42]=v41;}
const v44=v40;
const v45=v44.length;
const v46=new Array(v45);
for(let v47=0;v47<v45;v47++){
const v48=v44[v47];
const v49=v48;
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
v46[v47]=v54;
}
return v46;}
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
const v104=v86;
const v105=v104.length;
const v106=new Array(v105);
for(let v107=0;v107<v105;v107++){
const v108=v104[v107];
const v109=v108;
const v110=v87;
const v111=v88;
/* inline right_word */
const v112=v109;
const v113=v111;
let v114;if(v113===0 ){
v114=0;}else{
v114=((v112%v113)+0);}
const v115=v114;
const v116=v111;
v106[v107]=(((v115) + (v116)) >>> 0);
}
const v117=v106;
const v118=Math.min(v103.length,v117.length);
const v119=new Array(v118);
for(let v120=0;v120<v118;v120++){
const v121=v103[v120];
const v122=v117[v120];
const v123=v121;
const v124=v122;
v119[v120]=(((v123) + (v124)) >>> 0);
}
const v125=v119;
const v126=new Array(v125.length);
let v127=0;
for(let v128=0;v128<v125.length;v128++){
const v129=v125[v128];
v127=(((v127) + (v129)) >>> 0);v126[v128]=v127;}
const v130=v126;
const v131=v130.length;
for(let v133=0;v133<v131;v133++){
const v134=v130[v133];
const v135=v134;
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
v89[v133]=v140;
}
return v131;}
const __namedTypes={};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v2","core_sha256":"5aa310a013947b69b2641adcf5b593bafecbd66b8fa483475d821067bcdde586","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":0,"internal":false,"name":"pipeline32_paired_prefix_add_heldout_u32","params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"element":{"kind":"u32"},"kind":"list"}},{"destination":null,"index":1,"internal":false,"name":"output_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":2,"internal":false,"name":"left_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":3,"internal":false,"name":"right_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}}],"named_types":{},"schema":1,"state":null};
const __implementations=[__fn0,__fn1,__fn2,__fn3];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>[f.name,__implementations[f.index]])));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[__into0,null,null,null];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>[f.name,__intoImplementations[f.index]])));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}
