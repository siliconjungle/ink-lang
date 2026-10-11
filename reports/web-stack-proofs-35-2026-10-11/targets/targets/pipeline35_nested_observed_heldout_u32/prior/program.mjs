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
const v22=v21.length;
const v23=new Array(v22);
for(let v24=0;v24<v22;v24++){
const v25=v21[v24];
const v26=v25;
const v27=v2;
const v28=v3;
/* inline post_word */
const v29=v26;
const v30=v27;
const v31=v28;
/* inline shift_word */
const v32=v29;
const v33=v30;
let v34;if(((v32) < (v33))){
const v35=v29;
const v36=v31;
v34=(((v35) + (v36)) >>> 0);}else{
const v37=v29;
const v38=v31;
v34=(((v37) - (v38)) >>> 0);}
v23[v24]=v34;
}
const v39=v23;
const v40=v1;
const v41=v40.length;
const v42=new Array(v41);
for(let v43=0;v43<v41;v43++){
const v44=v40[v43];
const v45=v44;
const v46=v2;
const v47=v3;
/* inline right_word */
const v48=v45;
const v49=v47;
/* inline normalize_right */
const v50=v48;
const v51=v49;
let v52;if(v51===0 ){
v52=0;}else{
v52=((v50%v51)+0);}
const v53=v52;
const v54=v48;
const v55=(((v53) + (v54)) >>> 0);
const v56=v47;
v42[v43]=(((v55) + (v56)) >>> 0);
}
const v57=v42;
const v58=Math.min(v39.length,v57.length);
const v59=new Array(v58);
for(let v60=0;v60<v58;v60++){
const v61=v39[v60];
const v62=v57[v60];
const v63=v61;
const v64=v62;
const v65=v2;
const v66=v3;
/* inline combine_words */
const v67=v63;
const v68=v64;
const v69=v65;
const v70=v66;
/* inline mix_words */
const v71=v67;
const v72=v69;
let v73;if(((v71) < (v72))){
const v74=v67;
const v75=v68;
const v76=(((v74) + (v75)) >>> 0);
const v77=v70;
v73=(Math.imul(v76,v77) >>> 0);}else{
const v78=v67;
const v79=v68;
const v80=(((v78) - (v79)) >>> 0);
const v81=v69;
v73=(((v80) + (v81)) >>> 0);}
v59[v60]=v73;
}
return v59;}
function __fn1(v82,v83,v84){
const v85=v82;
const v86=v84;
/* inline normalize_left */
const v87=v85;
const v88=v86;
let v89;if(v88===0 ){
v89=0;}else{
v89=(Math.trunc(v87/v88)+0);}
const v90=v89;
const v91=v85;
const v92=(((v90) + (v91)) >>> 0);
const v93=v83;
return (((v92) + (v93)) >>> 0);}
function __fn2(v94,v95){
const v96=v94;
const v97=v95;
let v98;if(v97===0 ){
v98=0;}else{
v98=(Math.trunc(v96/v97)+0);}
const v99=v98;
const v100=v94;
return (((v99) + (v100)) >>> 0);}
function __fn3(v101,v102,v103){
const v104=v101;
const v105=v103;
/* inline normalize_right */
const v106=v104;
const v107=v105;
let v108;if(v107===0 ){
v108=0;}else{
v108=((v106%v107)+0);}
const v109=v108;
const v110=v104;
const v111=(((v109) + (v110)) >>> 0);
const v112=v103;
return (((v111) + (v112)) >>> 0);}
function __fn4(v113,v114){
const v115=v113;
const v116=v114;
let v117;if(v116===0 ){
v117=0;}else{
v117=((v115%v116)+0);}
const v118=v117;
const v119=v113;
return (((v118) + (v119)) >>> 0);}
function __fn5(v120,v121,v122,v123){
const v124=v120;
const v125=v121;
const v126=v122;
const v127=v123;
/* inline mix_words */
const v128=v124;
const v129=v126;
let v130;if(((v128) < (v129))){
const v131=v124;
const v132=v125;
const v133=(((v131) + (v132)) >>> 0);
const v134=v127;
v130=(Math.imul(v133,v134) >>> 0);}else{
const v135=v124;
const v136=v125;
const v137=(((v135) - (v136)) >>> 0);
const v138=v126;
v130=(((v137) + (v138)) >>> 0);}
return v130;}
function __fn6(v139,v140,v141,v142){
const v143=v139;
const v144=v141;
let v145;if(((v143) < (v144))){
const v146=v139;
const v147=v140;
const v148=(((v146) + (v147)) >>> 0);
const v149=v142;
v145=(Math.imul(v148,v149) >>> 0);}else{
const v150=v139;
const v151=v140;
const v152=(((v150) - (v151)) >>> 0);
const v153=v141;
v145=(((v152) + (v153)) >>> 0);}
return v145;}
function __fn7(v154,v155,v156){
const v157=v154;
const v158=v155;
const v159=v156;
/* inline shift_word */
const v160=v157;
const v161=v158;
let v162;if(((v160) < (v161))){
const v163=v157;
const v164=v159;
v162=(((v163) + (v164)) >>> 0);}else{
const v165=v157;
const v166=v159;
v162=(((v165) - (v166)) >>> 0);}
return v162;}
function __fn8(v167,v168,v169){
const v170=v167;
const v171=v168;
let v172;if(((v170) < (v171))){
const v173=v167;
const v174=v169;
v172=(((v173) + (v174)) >>> 0);}else{
const v175=v167;
const v176=v169;
v172=(((v175) - (v176)) >>> 0);}
return v172;}
function __into0(v177,v178,v179,v180,v181){
const v182=v177;
const v183=v182.length;
const v184=new Array(v183);
for(let v185=0;v185<v183;v185++){
const v186=v182[v185];
const v187=v186;
const v188=v179;
const v189=v180;
/* inline left_word */
const v190=v187;
const v191=v189;
/* inline normalize_left */
const v192=v190;
const v193=v191;
let v194;if(v193===0 ){
v194=0;}else{
v194=(Math.trunc(v192/v193)+0);}
const v195=v194;
const v196=v190;
const v197=(((v195) + (v196)) >>> 0);
const v198=v188;
v184[v185]=(((v197) + (v198)) >>> 0);
}
const v199=v184;
const v200=v199.length;
const v201=new Array(v200);
for(let v202=0;v202<v200;v202++){
const v203=v199[v202];
const v204=v203;
const v205=v179;
const v206=v180;
/* inline post_word */
const v207=v204;
const v208=v205;
const v209=v206;
/* inline shift_word */
const v210=v207;
const v211=v208;
let v212;if(((v210) < (v211))){
const v213=v207;
const v214=v209;
v212=(((v213) + (v214)) >>> 0);}else{
const v215=v207;
const v216=v209;
v212=(((v215) - (v216)) >>> 0);}
v201[v202]=v212;
}
const v217=v201;
const v218=v178;
const v219=v218.length;
const v220=new Array(v219);
for(let v221=0;v221<v219;v221++){
const v222=v218[v221];
const v223=v222;
const v224=v179;
const v225=v180;
/* inline right_word */
const v226=v223;
const v227=v225;
/* inline normalize_right */
const v228=v226;
const v229=v227;
let v230;if(v229===0 ){
v230=0;}else{
v230=((v228%v229)+0);}
const v231=v230;
const v232=v226;
const v233=(((v231) + (v232)) >>> 0);
const v234=v225;
v220[v221]=(((v233) + (v234)) >>> 0);
}
const v235=v220;
const v236=Math.min(v217.length,v235.length);
for(let v238=0;v238<v236;v238++){
const v239=v217[v238];
const v240=v235[v238];
const v241=v239;
const v242=v240;
const v243=v179;
const v244=v180;
/* inline combine_words */
const v245=v241;
const v246=v242;
const v247=v243;
const v248=v244;
/* inline mix_words */
const v249=v245;
const v250=v247;
let v251;if(((v249) < (v250))){
const v252=v245;
const v253=v246;
const v254=(((v252) + (v253)) >>> 0);
const v255=v248;
v251=(Math.imul(v254,v255) >>> 0);}else{
const v256=v245;
const v257=v246;
const v258=(((v256) - (v257)) >>> 0);
const v259=v247;
v251=(((v258) + (v259)) >>> 0);}
v181[v238]=v251;
}
return v236;}
const __namedTypes={};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v2","core_sha256":"1f310d1e21c99cdb2d71062fab98c23e062c33d63253b60b8f25b7e59f11a7f4","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":0,"internal":false,"name":"pipeline35_nested_observed_heldout_u32","params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"element":{"kind":"u32"},"kind":"list"}},{"destination":null,"index":1,"internal":false,"name":"left_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":2,"internal":false,"name":"normalize_left","params":[{"name":"x","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":3,"internal":false,"name":"right_word","params":[{"name":"y","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":4,"internal":false,"name":"normalize_right","params":[{"name":"y","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":5,"internal":false,"name":"combine_words","params":[{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":6,"internal":false,"name":"mix_words","params":[{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":7,"internal":false,"name":"post_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":8,"internal":false,"name":"shift_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}}],"named_types":{},"schema":1,"state":null};
const __implementations=[__fn0,__fn1,__fn2,__fn3,__fn4,__fn5,__fn6,__fn7,__fn8];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>[f.name,__implementations[f.index]])));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[__into0,null,null,null,null,null,null,null,null];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>[f.name,__intoImplementations[f.index]])));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}
