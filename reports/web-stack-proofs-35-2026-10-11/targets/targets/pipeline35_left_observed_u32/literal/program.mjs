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
/* inline normalize_left */
const v14=v12;
const v15=v13;
let v16;if(v15===0 ){
v16=0;}else{
v16=(Math.trunc(v14/v15)+0);}
const v17=v16;
const v18=v12;
const v19=(((v17) + (v18)) >>> 0);
const v20=v10;
v6[v7]=(((v19) + (v20)) >>> 0);
}
const v21=v6;
const v22=v1;
const v23=Math.min(v21.length,v22.length);
const v24=new Array(v23);
for(let v25=0;v25<v23;v25++){
const v26=v21[v25];
const v27=v22[v25];
const v28=v26;
const v29=v27;
const v30=v2;
const v31=v3;
/* inline combine_words */
const v32=v28;
const v33=v29;
const v34=v30;
const v35=v31;
/* inline mix_words */
const v36=v32;
const v37=v33;
let v38;if(((v36) < (v37))){
const v39=v32;
const v40=v33;
const v41=v35;
const v42=(Math.imul(v40,v41) >>> 0);
v38=(((v39) + (v42)) >>> 0);}else{
const v43=v32;
const v44=v33;
const v45=v35;
const v46=(Math.imul(v44,v45) >>> 0);
v38=(((v43) - (v46)) >>> 0);}
const v47=v38;
const v48=v34;
v24[v25]=(((v47) + (v48)) >>> 0);
}
return v24;}
function __fn1(v49,v50,v51){
const v52=v49;
const v53=v51;
/* inline normalize_left */
const v54=v52;
const v55=v53;
let v56;if(v55===0 ){
v56=0;}else{
v56=(Math.trunc(v54/v55)+0);}
const v57=v56;
const v58=v52;
const v59=(((v57) + (v58)) >>> 0);
const v60=v50;
return (((v59) + (v60)) >>> 0);}
function __fn2(v61,v62){
const v63=v61;
const v64=v62;
let v65;if(v64===0 ){
v65=0;}else{
v65=(Math.trunc(v63/v64)+0);}
const v66=v65;
const v67=v61;
return (((v66) + (v67)) >>> 0);}
function __fn3(v68,v69,v70){
const v71=v68;
const v72=v70;
/* inline normalize_right */
const v73=v71;
const v74=v72;
let v75;if(v74===0 ){
v75=0;}else{
v75=((v73%v74)+0);}
const v76=v75;
const v77=v71;
const v78=(((v76) + (v77)) >>> 0);
const v79=v70;
return (((v78) + (v79)) >>> 0);}
function __fn4(v80,v81){
const v82=v80;
const v83=v81;
let v84;if(v83===0 ){
v84=0;}else{
v84=((v82%v83)+0);}
const v85=v84;
const v86=v80;
return (((v85) + (v86)) >>> 0);}
function __fn5(v87,v88,v89,v90){
const v91=v87;
const v92=v88;
const v93=v89;
const v94=v90;
/* inline mix_words */
const v95=v91;
const v96=v92;
let v97;if(((v95) < (v96))){
const v98=v91;
const v99=v92;
const v100=v94;
const v101=(Math.imul(v99,v100) >>> 0);
v97=(((v98) + (v101)) >>> 0);}else{
const v102=v91;
const v103=v92;
const v104=v94;
const v105=(Math.imul(v103,v104) >>> 0);
v97=(((v102) - (v105)) >>> 0);}
const v106=v97;
const v107=v93;
return (((v106) + (v107)) >>> 0);}
function __fn6(v108,v109,v110,v111){
const v112=v108;
const v113=v109;
let v114;if(((v112) < (v113))){
const v115=v108;
const v116=v109;
const v117=v111;
const v118=(Math.imul(v116,v117) >>> 0);
v114=(((v115) + (v118)) >>> 0);}else{
const v119=v108;
const v120=v109;
const v121=v111;
const v122=(Math.imul(v120,v121) >>> 0);
v114=(((v119) - (v122)) >>> 0);}
const v123=v114;
const v124=v110;
return (((v123) + (v124)) >>> 0);}
function __into0(v125,v126,v127,v128,v129){
const v130=v125;
const v131=v130.length;
const v132=new Array(v131);
for(let v133=0;v133<v131;v133++){
const v134=v130[v133];
const v135=v134;
const v136=v127;
const v137=v128;
/* inline left_word */
const v138=v135;
const v139=v137;
/* inline normalize_left */
const v140=v138;
const v141=v139;
let v142;if(v141===0 ){
v142=0;}else{
v142=(Math.trunc(v140/v141)+0);}
const v143=v142;
const v144=v138;
const v145=(((v143) + (v144)) >>> 0);
const v146=v136;
v132[v133]=(((v145) + (v146)) >>> 0);
}
const v147=v132;
const v148=v126;
const v149=Math.min(v147.length,v148.length);
for(let v151=0;v151<v149;v151++){
const v152=v147[v151];
const v153=v148[v151];
const v154=v152;
const v155=v153;
const v156=v127;
const v157=v128;
/* inline combine_words */
const v158=v154;
const v159=v155;
const v160=v156;
const v161=v157;
/* inline mix_words */
const v162=v158;
const v163=v159;
let v164;if(((v162) < (v163))){
const v165=v158;
const v166=v159;
const v167=v161;
const v168=(Math.imul(v166,v167) >>> 0);
v164=(((v165) + (v168)) >>> 0);}else{
const v169=v158;
const v170=v159;
const v171=v161;
const v172=(Math.imul(v170,v171) >>> 0);
v164=(((v169) - (v172)) >>> 0);}
const v173=v164;
const v174=v160;
v129[v151]=(((v173) + (v174)) >>> 0);
}
return v149;}
const __namedTypes={};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v2","core_sha256":"1e7baa6b8eb3f8443b77523e21b4a17a29de3a07fe1a4a45a721359449c7652e","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":0,"internal":false,"name":"pipeline35_left_observed_u32","params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"element":{"kind":"u32"},"kind":"list"}},{"destination":null,"index":1,"internal":false,"name":"left_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":2,"internal":false,"name":"normalize_left","params":[{"name":"x","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":3,"internal":false,"name":"right_word","params":[{"name":"y","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":4,"internal":false,"name":"normalize_right","params":[{"name":"y","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":5,"internal":false,"name":"combine_words","params":[{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":6,"internal":false,"name":"mix_words","params":[{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}}],"named_types":{},"schema":1,"state":null};
const __implementations=[__fn0,__fn1,__fn2,__fn3,__fn4,__fn5,__fn6];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>[f.name,__implementations[f.index]])));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[__into0,null,null,null,null,null,null];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>[f.name,__intoImplementations[f.index]])));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}
