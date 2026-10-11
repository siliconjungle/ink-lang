function __fn0(v0,v1,v2,v3){
const v4=v0;
const v5=v4.length;
const v6=new Array(v5);
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
const v28=(((v26) + (v27)) >>> 0);
const v29=v9;
const v30=v8;
const v31=v2;
const v32=v3;
/* inline right_word */
const v33=v29;
const v34=v30;
const v35=v31;
const v36=v32;
/* inline right_signal */
const v37=v33;
const v38=v35;
let v39;if(((v37) < (v38))){
const v40=v34;
const v41=v36;
v39=(((v40) + (v41)) >>> 0);}else{
const v42=v34;
const v43=3;
v39=(Math.imul(v42,v43) >>> 0);}
const v44=v39;
const v45=v2;
const v46=v3;
/* inline pair_word */
const v47=v28;
const v48=v44;
const v49=v45;
const v50=v46;
/* inline pair_signal */
const v51=v47;
const v52=v48;
let v53;if(((v51) < (v52))){
const v54=v47;
const v55=v50;
let v56;if(v55===0 ){
v56=0;}else{
v56=(Math.trunc(v54/v55)+0);}
const v57=v56;
const v58=v48;
v53=(((v57) + (v58)) >>> 0);}else{
const v59=v48;
const v60=v50;
let v61;if(v60===0 ){
v61=0;}else{
v61=((v59%v60)+0);}
const v62=v61;
const v63=v47;
v53=(((v62) + (v63)) >>> 0);}
v6[v7]=v53;
}
return v6;}
function __fn1(v64,v65,v66,v67){
const v68=v64;
const v69=v65;
const v70=v66;
const v71=v67;
/* inline left_signal */
const v72=v69;
const v73=v71;
let v74;if(v73===0 ){
v74=0;}else{
v74=(Math.trunc(v72/v73)+0);}
const v75=v74;
const v76=v68;
const v77=v71;
let v78;if(v77===0 ){
v78=0;}else{
v78=((v76%v77)+0);}
const v79=v78;
const v80=(((v75) + (v79)) >>> 0);
const v81=v70;
return (((v80) + (v81)) >>> 0);}
function __fn2(v82,v83,v84,v85){
const v86=v83;
const v87=v85;
let v88;if(v87===0 ){
v88=0;}else{
v88=(Math.trunc(v86/v87)+0);}
const v89=v88;
const v90=v82;
const v91=v85;
let v92;if(v91===0 ){
v92=0;}else{
v92=((v90%v91)+0);}
const v93=v92;
const v94=(((v89) + (v93)) >>> 0);
const v95=v84;
return (((v94) + (v95)) >>> 0);}
function __fn3(v96,v97,v98,v99){
const v100=v96;
const v101=v97;
const v102=v98;
const v103=v99;
/* inline right_signal */
const v104=v100;
const v105=v102;
let v106;if(((v104) < (v105))){
const v107=v101;
const v108=v103;
v106=(((v107) + (v108)) >>> 0);}else{
const v109=v101;
const v110=3;
v106=(Math.imul(v109,v110) >>> 0);}
return v106;}
function __fn4(v111,v112,v113,v114){
const v115=v111;
const v116=v113;
let v117;if(((v115) < (v116))){
const v118=v112;
const v119=v114;
v117=(((v118) + (v119)) >>> 0);}else{
const v120=v112;
const v121=3;
v117=(Math.imul(v120,v121) >>> 0);}
return v117;}
function __fn5(v122,v123,v124,v125){
const v126=v122;
const v127=v123;
const v128=v124;
const v129=v125;
/* inline pair_signal */
const v130=v126;
const v131=v127;
let v132;if(((v130) < (v131))){
const v133=v126;
const v134=v129;
let v135;if(v134===0 ){
v135=0;}else{
v135=(Math.trunc(v133/v134)+0);}
const v136=v135;
const v137=v127;
v132=(((v136) + (v137)) >>> 0);}else{
const v138=v127;
const v139=v129;
let v140;if(v139===0 ){
v140=0;}else{
v140=((v138%v139)+0);}
const v141=v140;
const v142=v126;
v132=(((v141) + (v142)) >>> 0);}
return v132;}
function __fn6(v143,v144,v145,v146){
const v147=v143;
const v148=v144;
let v149;if(((v147) < (v148))){
const v150=v143;
const v151=v146;
let v152;if(v151===0 ){
v152=0;}else{
v152=(Math.trunc(v150/v151)+0);}
const v153=v152;
const v154=v144;
v149=(((v153) + (v154)) >>> 0);}else{
const v155=v144;
const v156=v146;
let v157;if(v156===0 ){
v157=0;}else{
v157=((v155%v156)+0);}
const v158=v157;
const v159=v143;
v149=(((v158) + (v159)) >>> 0);}
return v149;}
function __into0(v160,v161,v162,v163,v164){
const v165=v160;
const v166=v165.length;
for(let v168=0;v168<v166;v168++){
const v169=v165[v168];
const v170=(v168>>>0);
const v171=v170;
const v172=v169;
const v173=v162;
const v174=v163;
/* inline left_word */
const v175=v171;
const v176=v172;
const v177=v173;
const v178=v174;
/* inline left_signal */
const v179=v176;
const v180=v178;
let v181;if(v180===0 ){
v181=0;}else{
v181=(Math.trunc(v179/v180)+0);}
const v182=v181;
const v183=v175;
const v184=v178;
let v185;if(v184===0 ){
v185=0;}else{
v185=((v183%v184)+0);}
const v186=v185;
const v187=(((v182) + (v186)) >>> 0);
const v188=v177;
const v189=(((v187) + (v188)) >>> 0);
const v190=v170;
const v191=v169;
const v192=v162;
const v193=v163;
/* inline right_word */
const v194=v190;
const v195=v191;
const v196=v192;
const v197=v193;
/* inline right_signal */
const v198=v194;
const v199=v196;
let v200;if(((v198) < (v199))){
const v201=v195;
const v202=v197;
v200=(((v201) + (v202)) >>> 0);}else{
const v203=v195;
const v204=3;
v200=(Math.imul(v203,v204) >>> 0);}
const v205=v200;
const v206=v162;
const v207=v163;
/* inline pair_word */
const v208=v189;
const v209=v205;
const v210=v206;
const v211=v207;
/* inline pair_signal */
const v212=v208;
const v213=v209;
let v214;if(((v212) < (v213))){
const v215=v208;
const v216=v211;
let v217;if(v216===0 ){
v217=0;}else{
v217=(Math.trunc(v215/v216)+0);}
const v218=v217;
const v219=v209;
v214=(((v218) + (v219)) >>> 0);}else{
const v220=v209;
const v221=v211;
let v222;if(v221===0 ){
v222=0;}else{
v222=((v220%v221)+0);}
const v223=v222;
const v224=v208;
v214=(((v223) + (v224)) >>> 0);}
v164[v168]=v214;
}
return v166;}
const __namedTypes={};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v2","core_sha256":"ded7a2e1cba29ee7b0f469ea181fe0a04c6f37706649ca90fe445550fda2dc35","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":0,"internal":false,"name":"pipeline38_left_padded_zip_heldout_u32","params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"element":{"kind":"u32"},"kind":"list"}},{"destination":null,"index":1,"internal":false,"name":"left_word","params":[{"name":"i","type":{"kind":"u32"}},{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":2,"internal":false,"name":"left_signal","params":[{"name":"i","type":{"kind":"u32"}},{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":3,"internal":false,"name":"right_word","params":[{"name":"i","type":{"kind":"u32"}},{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":4,"internal":false,"name":"right_signal","params":[{"name":"i","type":{"kind":"u32"}},{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":5,"internal":false,"name":"pair_word","params":[{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":6,"internal":false,"name":"pair_signal","params":[{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}}],"named_types":{},"schema":1,"state":null};
const __implementations=[__fn0,__fn1,__fn2,__fn3,__fn4,__fn5,__fn6];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>[f.name,__implementations[f.index]])));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[__into0,null,null,null,null,null,null];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>[f.name,__intoImplementations[f.index]])));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}
