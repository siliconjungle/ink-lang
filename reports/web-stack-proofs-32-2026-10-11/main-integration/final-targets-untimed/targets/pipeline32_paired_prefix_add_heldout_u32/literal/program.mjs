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
v43[v44]=(((v47) + (v48)) >>> 0);
}
const v49=v43;
const v50=v49.length;
const v51=new Array(v50);
for(let v52=0;v52<v50;v52++){
const v53=v49[v52];
const v54=v53;
const v55=v2;
const v56=v3;
/* inline output_word */
const v57=v54;
const v58=v55;
let v59;if(((v57) < (v58))){
const v60=v54;
const v61=v56;
v59=(((v60) + (v61)) >>> 0);}else{
const v62=v54;
const v63=v56;
v59=(((v62) - (v63)) >>> 0);}
v51[v52]=v59;
}
return v51;}
function __fn1(v64,v65,v66){
const v67=v64;
const v68=v65;
let v69;if(((v67) < (v68))){
const v70=v64;
const v71=v66;
v69=(((v70) + (v71)) >>> 0);}else{
const v72=v64;
const v73=v66;
v69=(((v72) - (v73)) >>> 0);}
return v69;}
function __fn2(v74,v75,v76){
const v77=v74;
const v78=v76;
let v79;if(v78===0 ){
v79=0;}else{
v79=(Math.trunc(v77/v78)+0);}
const v80=v79;
const v81=v75;
return (((v80) + (v81)) >>> 0);}
function __fn3(v82,v83,v84){
const v85=v82;
const v86=v84;
let v87;if(v86===0 ){
v87=0;}else{
v87=((v85%v86)+0);}
const v88=v87;
const v89=v84;
return (((v88) + (v89)) >>> 0);}
function __into0(v90,v91,v92,v93,v94){
const v95=v90;
const v96=v95.length;
const v97=new Array(v96);
for(let v98=0;v98<v96;v98++){
const v99=v95[v98];
const v100=v99;
const v101=v92;
const v102=v93;
/* inline left_word */
const v103=v100;
const v104=v102;
let v105;if(v104===0 ){
v105=0;}else{
v105=(Math.trunc(v103/v104)+0);}
const v106=v105;
const v107=v101;
v97[v98]=(((v106) + (v107)) >>> 0);
}
const v108=v97;
const v109=new Array(v108.length);
let v110=0;
for(let v111=0;v111<v108.length;v111++){
const v112=v108[v111];
v110=(((v110) + (v112)) >>> 0);v109[v111]=v110;}
const v113=v109;
const v114=v91;
const v115=v114.length;
const v116=new Array(v115);
for(let v117=0;v117<v115;v117++){
const v118=v114[v117];
const v119=v118;
const v120=v92;
const v121=v93;
/* inline right_word */
const v122=v119;
const v123=v121;
let v124;if(v123===0 ){
v124=0;}else{
v124=((v122%v123)+0);}
const v125=v124;
const v126=v121;
v116[v117]=(((v125) + (v126)) >>> 0);
}
const v127=v116;
const v128=new Array(v127.length);
let v129=0;
for(let v130=0;v130<v127.length;v130++){
const v131=v127[v130];
v129=(((v129) + (v131)) >>> 0);v128[v130]=v129;}
const v132=v128;
const v133=Math.min(v113.length,v132.length);
const v134=new Array(v133);
for(let v135=0;v135<v133;v135++){
const v136=v113[v135];
const v137=v132[v135];
const v138=v136;
const v139=v137;
v134[v135]=(((v138) + (v139)) >>> 0);
}
const v140=v134;
const v141=v140.length;
for(let v143=0;v143<v141;v143++){
const v144=v140[v143];
const v145=v144;
const v146=v92;
const v147=v93;
/* inline output_word */
const v148=v145;
const v149=v146;
let v150;if(((v148) < (v149))){
const v151=v145;
const v152=v147;
v150=(((v151) + (v152)) >>> 0);}else{
const v153=v145;
const v154=v147;
v150=(((v153) - (v154)) >>> 0);}
v94[v143]=v150;
}
return v141;}
const __namedTypes={};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v2","core_sha256":"e341e13020785d3b18616333a2ccb322fd90fee4921392e82d7c6c88f7bcc3d7","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":0,"internal":false,"name":"pipeline32_paired_prefix_add_heldout_u32","params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"element":{"kind":"u32"},"kind":"list"}},{"destination":null,"index":1,"internal":false,"name":"output_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":2,"internal":false,"name":"left_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":3,"internal":false,"name":"right_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}}],"named_types":{},"schema":1,"state":null};
const __implementations=[__fn0,__fn1,__fn2,__fn3];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>[f.name,__implementations[f.index]])));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[__into0,null,null,null];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>[f.name,__intoImplementations[f.index]])));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}
