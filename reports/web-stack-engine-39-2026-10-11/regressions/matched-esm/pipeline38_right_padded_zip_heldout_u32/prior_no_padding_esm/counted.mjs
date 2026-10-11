function __fn0(v0,v1,v2,v3){
const v4=v0;
const v5=v4.length;
const v6=__diagArray(v5);
for(let v7=0;v7<v5;v7++){
const v8=v4[v7];
const v9=(v7>>>0);
const v10=v9;
const v11=v8;
const v12=v2;
const v13=v3;
/* inline left_word */
const v14=v10;
const v15=v11;
const v16=v12;
const v17=v13;
/* inline left_signal */
const v18=v15;
const v19=v17;
let v20;if(v19===0 ){
v20=0;}else{
v20=(Math.trunc(v18/v19)+0);}
const v21=v20;
const v22=v14;
const v23=v17;
let v24;if(v23===0 ){
v24=0;}else{
v24=((v22%v23)+0);}
const v25=v24;
const v26=(((v21) + (v25)) >>> 0);
const v27=v16;
v6[v7]=(((v26) + (v27)) >>> 0);
}
const v28=v6;
const v29=v0;
const v30=v29.length;
const v31=__diagArray(v30);
for(let v32=0;v32<v30;v32++){
const v33=v29[v32];
const v34=(v32>>>0);
const v35=v34;
const v36=v33;
const v37=v2;
const v38=v3;
/* inline right_word */
const v39=v35;
const v40=v36;
const v41=v37;
const v42=v38;
/* inline right_signal */
const v43=v39;
const v44=v41;
let v45;if(((v43) < (v44))){
const v46=v40;
const v47=v42;
v45=(((v46) + (v47)) >>> 0);}else{
const v48=v40;
const v49=3;
v45=(Math.imul(v48,v49) >>> 0);}
v31[v32]=v45;
}
const v50=v31;
const v51=v1;
const v52=v50.length;
const v53=v51.length;
const v54=v50; // diagnostic: appended suffix is not materialized
const v57=v54;
const v58=Math.min(v28.length,v57.length);
const v59=__diagArray(v58);
for(let v60=0;v60<v58;v60++){
const v61=v28[v60];
const v62=v57[v60];
const v63=v61;
const v64=v62;
const v65=v2;
const v66=v3;
/* inline pair_word */
const v67=v63;
const v68=v64;
const v69=v65;
const v70=v66;
/* inline pair_signal */
const v71=v67;
const v72=v68;
let v73;if(((v71) < (v72))){
const v74=v67;
const v75=v70;
let v76;if(v75===0 ){
v76=0;}else{
v76=(Math.trunc(v74/v75)+0);}
const v77=v76;
const v78=v68;
v73=(((v77) + (v78)) >>> 0);}else{
const v79=v68;
const v80=v70;
let v81;if(v80===0 ){
v81=0;}else{
v81=((v79%v80)+0);}
const v82=v81;
const v83=v67;
v73=(((v82) + (v83)) >>> 0);}
v59[v60]=v73;
}
return v59;}
function __fn1(v84,v85,v86,v87){
const v88=v84;
const v89=v85;
const v90=v86;
const v91=v87;
/* inline left_signal */
const v92=v89;
const v93=v91;
let v94;if(v93===0 ){
v94=0;}else{
v94=(Math.trunc(v92/v93)+0);}
const v95=v94;
const v96=v88;
const v97=v91;
let v98;if(v97===0 ){
v98=0;}else{
v98=((v96%v97)+0);}
const v99=v98;
const v100=(((v95) + (v99)) >>> 0);
const v101=v90;
return (((v100) + (v101)) >>> 0);}
function __fn2(v102,v103,v104,v105){
const v106=v103;
const v107=v105;
let v108;if(v107===0 ){
v108=0;}else{
v108=(Math.trunc(v106/v107)+0);}
const v109=v108;
const v110=v102;
const v111=v105;
let v112;if(v111===0 ){
v112=0;}else{
v112=((v110%v111)+0);}
const v113=v112;
const v114=(((v109) + (v113)) >>> 0);
const v115=v104;
return (((v114) + (v115)) >>> 0);}
function __fn3(v116,v117,v118,v119){
const v120=v116;
const v121=v117;
const v122=v118;
const v123=v119;
/* inline right_signal */
const v124=v120;
const v125=v122;
let v126;if(((v124) < (v125))){
const v127=v121;
const v128=v123;
v126=(((v127) + (v128)) >>> 0);}else{
const v129=v121;
const v130=3;
v126=(Math.imul(v129,v130) >>> 0);}
return v126;}
function __fn4(v131,v132,v133,v134){
const v135=v131;
const v136=v133;
let v137;if(((v135) < (v136))){
const v138=v132;
const v139=v134;
v137=(((v138) + (v139)) >>> 0);}else{
const v140=v132;
const v141=3;
v137=(Math.imul(v140,v141) >>> 0);}
return v137;}
function __fn5(v142,v143,v144,v145){
const v146=v142;
const v147=v143;
const v148=v144;
const v149=v145;
/* inline pair_signal */
const v150=v146;
const v151=v147;
let v152;if(((v150) < (v151))){
const v153=v146;
const v154=v149;
let v155;if(v154===0 ){
v155=0;}else{
v155=(Math.trunc(v153/v154)+0);}
const v156=v155;
const v157=v147;
v152=(((v156) + (v157)) >>> 0);}else{
const v158=v147;
const v159=v149;
let v160;if(v159===0 ){
v160=0;}else{
v160=((v158%v159)+0);}
const v161=v160;
const v162=v146;
v152=(((v161) + (v162)) >>> 0);}
return v152;}
function __fn6(v163,v164,v165,v166){
const v167=v163;
const v168=v164;
let v169;if(((v167) < (v168))){
const v170=v163;
const v171=v166;
let v172;if(v171===0 ){
v172=0;}else{
v172=(Math.trunc(v170/v171)+0);}
const v173=v172;
const v174=v164;
v169=(((v173) + (v174)) >>> 0);}else{
const v175=v164;
const v176=v166;
let v177;if(v176===0 ){
v177=0;}else{
v177=((v175%v176)+0);}
const v178=v177;
const v179=v163;
v169=(((v178) + (v179)) >>> 0);}
return v169;}
function __into0(v180,v181,v182,v183,v184){
const v185=v180;
const v186=v185.length;
const v187=new Array(v186);
for(let v188=0;v188<v186;v188++){
const v189=v185[v188];
const v190=(v188>>>0);
const v191=v190;
const v192=v189;
const v193=v182;
const v194=v183;
/* inline left_word */
const v195=v191;
const v196=v192;
const v197=v193;
const v198=v194;
/* inline left_signal */
const v199=v196;
const v200=v198;
let v201;if(v200===0 ){
v201=0;}else{
v201=(Math.trunc(v199/v200)+0);}
const v202=v201;
const v203=v195;
const v204=v198;
let v205;if(v204===0 ){
v205=0;}else{
v205=((v203%v204)+0);}
const v206=v205;
const v207=(((v202) + (v206)) >>> 0);
const v208=v197;
v187[v188]=(((v207) + (v208)) >>> 0);
}
const v209=v187;
const v210=v180;
const v211=v210.length;
const v212=new Array(v211);
for(let v213=0;v213<v211;v213++){
const v214=v210[v213];
const v215=(v213>>>0);
const v216=v215;
const v217=v214;
const v218=v182;
const v219=v183;
/* inline right_word */
const v220=v216;
const v221=v217;
const v222=v218;
const v223=v219;
/* inline right_signal */
const v224=v220;
const v225=v222;
let v226;if(((v224) < (v225))){
const v227=v221;
const v228=v223;
v226=(((v227) + (v228)) >>> 0);}else{
const v229=v221;
const v230=3;
v226=(Math.imul(v229,v230) >>> 0);}
v212[v213]=v226;
}
const v231=v212;
const v232=v181;
const v233=v231.length;
const v234=v232.length;
const v235=new Array(v233+v234);
for(let v236=0;v236<v233;v236++){v235[v236]=v231[v236];}
for(let v237=0;v237<v234;v237++){v235[v233+v237]=v232[v237];}
const v238=v235;
const v239=Math.min(v209.length,v238.length);
for(let v241=0;v241<v239;v241++){
const v242=v209[v241];
const v243=v238[v241];
const v244=v242;
const v245=v243;
const v246=v182;
const v247=v183;
/* inline pair_word */
const v248=v244;
const v249=v245;
const v250=v246;
const v251=v247;
/* inline pair_signal */
const v252=v248;
const v253=v249;
let v254;if(((v252) < (v253))){
const v255=v248;
const v256=v251;
let v257;if(v256===0 ){
v257=0;}else{
v257=(Math.trunc(v255/v256)+0);}
const v258=v257;
const v259=v249;
v254=(((v258) + (v259)) >>> 0);}else{
const v260=v249;
const v261=v251;
let v262;if(v261===0 ){
v262=0;}else{
v262=((v260%v261)+0);}
const v263=v262;
const v264=v248;
v254=(((v263) + (v264)) >>> 0);}
v184[v241]=v254;
}
return v239;}
const __namedTypes={};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v4","core_sha256":"b2e576e69d51f2ec9a21469ad96285e00b6cccdd4d8f90fd7f3d984b728e7f2d","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":0,"internal":false,"name":"pipeline38_right_padded_zip_heldout_u32","params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"element":{"kind":"u32"},"kind":"list"}},{"destination":null,"index":1,"internal":false,"name":"left_word","params":[{"name":"i","type":{"kind":"u32"}},{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":2,"internal":false,"name":"left_signal","params":[{"name":"i","type":{"kind":"u32"}},{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":3,"internal":false,"name":"right_word","params":[{"name":"i","type":{"kind":"u32"}},{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":4,"internal":false,"name":"right_signal","params":[{"name":"i","type":{"kind":"u32"}},{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":5,"internal":false,"name":"pair_word","params":[{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":6,"internal":false,"name":"pair_signal","params":[{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}}],"named_types":{},"schema":1,"state":null};
const __implementations=[__fn0,__fn1,__fn2,__fn3,__fn4,__fn5,__fn6];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>[f.name,__implementations[f.index]])));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[__into0,null,null,null,null,null,null];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>[f.name,__intoImplementations[f.index]])));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}

let __diagAllocations=[];function __diagArray(n){__diagAllocations.push(n);return new Array(n)}
export function __diagnosticAllocations(){return __diagAllocations.slice()}
export function __resetDiagnosticAllocations(){__diagAllocations=[]}
