function __fn0(v0,v1,v2,v3){
const v4=v0;
const v5=v1;
const v6=Math.min(v4.length,v5.length);
const v7=new Array(v6);
for(let v8=0;v8<v6;v8++){
const v9=v4[v8];
const v10=v5[v8];
const v11=v9;
const v12=v2;
const v13=v3;
/* inline left_word */
const v14=v11;
const v15=v13;
/* inline normalize_left */
const v16=v14;
const v17=v15;
let v18;if(v17===0 ){
v18=0;}else{
v18=(Math.trunc(v16/v17)+0);}
const v19=v18;
const v20=v14;
const v21=(((v19) + (v20)) >>> 0);
const v22=v12;
const v23=(((v21) + (v22)) >>> 0);
const v24=v10;
const v25=v2;
const v26=v3;
/* inline right_word */
const v27=v24;
const v28=v26;
/* inline normalize_right */
const v29=v27;
const v30=v28;
let v31;if(v30===0 ){
v31=0;}else{
v31=((v29%v30)+0);}
const v32=v31;
const v33=v27;
const v34=(((v32) + (v33)) >>> 0);
const v35=v26;
const v36=(((v34) + (v35)) >>> 0);
const v37=v2;
const v38=v3;
/* inline combine_words */
const v39=v23;
const v40=v36;
const v41=v37;
const v42=v38;
/* inline mix_words */
const v43=v39;
const v44=v41;
let v45;if(((v43) < (v44))){
const v46=v39;
const v47=v40;
const v48=(((v46) + (v47)) >>> 0);
const v49=v42;
v45=(Math.imul(v48,v49) >>> 0);}else{
const v50=v39;
const v51=v40;
const v52=(((v50) - (v51)) >>> 0);
const v53=v41;
v45=(((v52) + (v53)) >>> 0);}
v7[v8]=v45;
}
return v7;}
function __fn1(v54,v55,v56){
const v57=v54;
const v58=v56;
/* inline normalize_left */
const v59=v57;
const v60=v58;
let v61;if(v60===0 ){
v61=0;}else{
v61=(Math.trunc(v59/v60)+0);}
const v62=v61;
const v63=v57;
const v64=(((v62) + (v63)) >>> 0);
const v65=v55;
return (((v64) + (v65)) >>> 0);}
function __fn2(v66,v67){
const v68=v66;
const v69=v67;
let v70;if(v69===0 ){
v70=0;}else{
v70=(Math.trunc(v68/v69)+0);}
const v71=v70;
const v72=v66;
return (((v71) + (v72)) >>> 0);}
function __fn3(v73,v74,v75){
const v76=v73;
const v77=v75;
/* inline normalize_right */
const v78=v76;
const v79=v77;
let v80;if(v79===0 ){
v80=0;}else{
v80=((v78%v79)+0);}
const v81=v80;
const v82=v76;
const v83=(((v81) + (v82)) >>> 0);
const v84=v75;
return (((v83) + (v84)) >>> 0);}
function __fn4(v85,v86){
const v87=v85;
const v88=v86;
let v89;if(v88===0 ){
v89=0;}else{
v89=((v87%v88)+0);}
const v90=v89;
const v91=v85;
return (((v90) + (v91)) >>> 0);}
function __fn5(v92,v93,v94,v95){
const v96=v92;
const v97=v93;
const v98=v94;
const v99=v95;
/* inline mix_words */
const v100=v96;
const v101=v98;
let v102;if(((v100) < (v101))){
const v103=v96;
const v104=v97;
const v105=(((v103) + (v104)) >>> 0);
const v106=v99;
v102=(Math.imul(v105,v106) >>> 0);}else{
const v107=v96;
const v108=v97;
const v109=(((v107) - (v108)) >>> 0);
const v110=v98;
v102=(((v109) + (v110)) >>> 0);}
return v102;}
function __fn6(v111,v112,v113,v114){
const v115=v111;
const v116=v113;
let v117;if(((v115) < (v116))){
const v118=v111;
const v119=v112;
const v120=(((v118) + (v119)) >>> 0);
const v121=v114;
v117=(Math.imul(v120,v121) >>> 0);}else{
const v122=v111;
const v123=v112;
const v124=(((v122) - (v123)) >>> 0);
const v125=v113;
v117=(((v124) + (v125)) >>> 0);}
return v117;}
function __into0(v126,v127,v128,v129,v130){
const v131=v126;
const v132=v127;
const v133=Math.min(v131.length,v132.length);
for(let v135=0;v135<v133;v135++){
const v136=v131[v135];
const v137=v132[v135];
const v138=v136;
const v139=v128;
const v140=v129;
/* inline left_word */
const v141=v138;
const v142=v140;
/* inline normalize_left */
const v143=v141;
const v144=v142;
let v145;if(v144===0 ){
v145=0;}else{
v145=(Math.trunc(v143/v144)+0);}
const v146=v145;
const v147=v141;
const v148=(((v146) + (v147)) >>> 0);
const v149=v139;
const v150=(((v148) + (v149)) >>> 0);
const v151=v137;
const v152=v128;
const v153=v129;
/* inline right_word */
const v154=v151;
const v155=v153;
/* inline normalize_right */
const v156=v154;
const v157=v155;
let v158;if(v157===0 ){
v158=0;}else{
v158=((v156%v157)+0);}
const v159=v158;
const v160=v154;
const v161=(((v159) + (v160)) >>> 0);
const v162=v153;
const v163=(((v161) + (v162)) >>> 0);
const v164=v128;
const v165=v129;
/* inline combine_words */
const v166=v150;
const v167=v163;
const v168=v164;
const v169=v165;
/* inline mix_words */
const v170=v166;
const v171=v168;
let v172;if(((v170) < (v171))){
const v173=v166;
const v174=v167;
const v175=(((v173) + (v174)) >>> 0);
const v176=v169;
v172=(Math.imul(v175,v176) >>> 0);}else{
const v177=v166;
const v178=v167;
const v179=(((v177) - (v178)) >>> 0);
const v180=v168;
v172=(((v179) + (v180)) >>> 0);}
v130[v135]=v172;
}
return v133;}
const __namedTypes={};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v2","core_sha256":"85ab92a10119cd998447ff8f3578e3414ade8b1f1a0a2af4013777c35f636592","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":0,"internal":false,"name":"pipeline35_both_observed_heldout_u32","params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"element":{"kind":"u32"},"kind":"list"}},{"destination":null,"index":1,"internal":false,"name":"left_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":2,"internal":false,"name":"normalize_left","params":[{"name":"x","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":3,"internal":false,"name":"right_word","params":[{"name":"y","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":4,"internal":false,"name":"normalize_right","params":[{"name":"y","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":5,"internal":false,"name":"combine_words","params":[{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":6,"internal":false,"name":"mix_words","params":[{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}}],"named_types":{},"schema":1,"state":null};
const __implementations=[__fn0,__fn1,__fn2,__fn3,__fn4,__fn5,__fn6];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>[f.name,__implementations[f.index]])));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[__into0,null,null,null,null,null,null];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>[f.name,__intoImplementations[f.index]])));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}
