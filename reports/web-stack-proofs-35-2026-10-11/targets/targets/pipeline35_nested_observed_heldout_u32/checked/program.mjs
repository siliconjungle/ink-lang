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
const v24=v2;
const v25=v3;
/* inline post_word */
const v26=v23;
const v27=v24;
const v28=v25;
/* inline shift_word */
const v29=v26;
const v30=v27;
let v31;if(((v29) < (v30))){
const v32=v26;
const v33=v28;
v31=(((v32) + (v33)) >>> 0);}else{
const v34=v26;
const v35=v28;
v31=(((v34) - (v35)) >>> 0);}
const v36=v31;
const v37=v10;
const v38=v2;
const v39=v3;
/* inline right_word */
const v40=v37;
const v41=v39;
/* inline normalize_right */
const v42=v40;
const v43=v41;
let v44;if(v43===0 ){
v44=0;}else{
v44=((v42%v43)+0);}
const v45=v44;
const v46=v40;
const v47=(((v45) + (v46)) >>> 0);
const v48=v39;
const v49=(((v47) + (v48)) >>> 0);
const v50=v2;
const v51=v3;
/* inline combine_words */
const v52=v36;
const v53=v49;
const v54=v50;
const v55=v51;
/* inline mix_words */
const v56=v52;
const v57=v54;
let v58;if(((v56) < (v57))){
const v59=v52;
const v60=v53;
const v61=(((v59) + (v60)) >>> 0);
const v62=v55;
v58=(Math.imul(v61,v62) >>> 0);}else{
const v63=v52;
const v64=v53;
const v65=(((v63) - (v64)) >>> 0);
const v66=v54;
v58=(((v65) + (v66)) >>> 0);}
v7[v8]=v58;
}
return v7;}
function __fn1(v67,v68,v69){
const v70=v67;
const v71=v69;
/* inline normalize_left */
const v72=v70;
const v73=v71;
let v74;if(v73===0 ){
v74=0;}else{
v74=(Math.trunc(v72/v73)+0);}
const v75=v74;
const v76=v70;
const v77=(((v75) + (v76)) >>> 0);
const v78=v68;
return (((v77) + (v78)) >>> 0);}
function __fn2(v79,v80){
const v81=v79;
const v82=v80;
let v83;if(v82===0 ){
v83=0;}else{
v83=(Math.trunc(v81/v82)+0);}
const v84=v83;
const v85=v79;
return (((v84) + (v85)) >>> 0);}
function __fn3(v86,v87,v88){
const v89=v86;
const v90=v88;
/* inline normalize_right */
const v91=v89;
const v92=v90;
let v93;if(v92===0 ){
v93=0;}else{
v93=((v91%v92)+0);}
const v94=v93;
const v95=v89;
const v96=(((v94) + (v95)) >>> 0);
const v97=v88;
return (((v96) + (v97)) >>> 0);}
function __fn4(v98,v99){
const v100=v98;
const v101=v99;
let v102;if(v101===0 ){
v102=0;}else{
v102=((v100%v101)+0);}
const v103=v102;
const v104=v98;
return (((v103) + (v104)) >>> 0);}
function __fn5(v105,v106,v107,v108){
const v109=v105;
const v110=v106;
const v111=v107;
const v112=v108;
/* inline mix_words */
const v113=v109;
const v114=v111;
let v115;if(((v113) < (v114))){
const v116=v109;
const v117=v110;
const v118=(((v116) + (v117)) >>> 0);
const v119=v112;
v115=(Math.imul(v118,v119) >>> 0);}else{
const v120=v109;
const v121=v110;
const v122=(((v120) - (v121)) >>> 0);
const v123=v111;
v115=(((v122) + (v123)) >>> 0);}
return v115;}
function __fn6(v124,v125,v126,v127){
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
function __fn7(v139,v140,v141){
const v142=v139;
const v143=v140;
const v144=v141;
/* inline shift_word */
const v145=v142;
const v146=v143;
let v147;if(((v145) < (v146))){
const v148=v142;
const v149=v144;
v147=(((v148) + (v149)) >>> 0);}else{
const v150=v142;
const v151=v144;
v147=(((v150) - (v151)) >>> 0);}
return v147;}
function __fn8(v152,v153,v154){
const v155=v152;
const v156=v153;
let v157;if(((v155) < (v156))){
const v158=v152;
const v159=v154;
v157=(((v158) + (v159)) >>> 0);}else{
const v160=v152;
const v161=v154;
v157=(((v160) - (v161)) >>> 0);}
return v157;}
function __into0(v162,v163,v164,v165,v166){
const v167=v162;
const v168=v163;
const v169=Math.min(v167.length,v168.length);
for(let v171=0;v171<v169;v171++){
const v172=v167[v171];
const v173=v168[v171];
const v174=v172;
const v175=v164;
const v176=v165;
/* inline left_word */
const v177=v174;
const v178=v176;
/* inline normalize_left */
const v179=v177;
const v180=v178;
let v181;if(v180===0 ){
v181=0;}else{
v181=(Math.trunc(v179/v180)+0);}
const v182=v181;
const v183=v177;
const v184=(((v182) + (v183)) >>> 0);
const v185=v175;
const v186=(((v184) + (v185)) >>> 0);
const v187=v164;
const v188=v165;
/* inline post_word */
const v189=v186;
const v190=v187;
const v191=v188;
/* inline shift_word */
const v192=v189;
const v193=v190;
let v194;if(((v192) < (v193))){
const v195=v189;
const v196=v191;
v194=(((v195) + (v196)) >>> 0);}else{
const v197=v189;
const v198=v191;
v194=(((v197) - (v198)) >>> 0);}
const v199=v194;
const v200=v173;
const v201=v164;
const v202=v165;
/* inline right_word */
const v203=v200;
const v204=v202;
/* inline normalize_right */
const v205=v203;
const v206=v204;
let v207;if(v206===0 ){
v207=0;}else{
v207=((v205%v206)+0);}
const v208=v207;
const v209=v203;
const v210=(((v208) + (v209)) >>> 0);
const v211=v202;
const v212=(((v210) + (v211)) >>> 0);
const v213=v164;
const v214=v165;
/* inline combine_words */
const v215=v199;
const v216=v212;
const v217=v213;
const v218=v214;
/* inline mix_words */
const v219=v215;
const v220=v217;
let v221;if(((v219) < (v220))){
const v222=v215;
const v223=v216;
const v224=(((v222) + (v223)) >>> 0);
const v225=v218;
v221=(Math.imul(v224,v225) >>> 0);}else{
const v226=v215;
const v227=v216;
const v228=(((v226) - (v227)) >>> 0);
const v229=v217;
v221=(((v228) + (v229)) >>> 0);}
v166[v171]=v221;
}
return v169;}
const __namedTypes={};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v2","core_sha256":"c73e0bdf2c870be54cb56a1300b7e22bd0fe5ee91715510a556cd78c717ab8dd","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":0,"internal":false,"name":"pipeline35_nested_observed_heldout_u32","params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"element":{"kind":"u32"},"kind":"list"}},{"destination":null,"index":1,"internal":false,"name":"left_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":2,"internal":false,"name":"normalize_left","params":[{"name":"x","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":3,"internal":false,"name":"right_word","params":[{"name":"y","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":4,"internal":false,"name":"normalize_right","params":[{"name":"y","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":5,"internal":false,"name":"combine_words","params":[{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":6,"internal":false,"name":"mix_words","params":[{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":7,"internal":false,"name":"post_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":8,"internal":false,"name":"shift_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}}],"named_types":{},"schema":1,"state":null};
const __implementations=[__fn0,__fn1,__fn2,__fn3,__fn4,__fn5,__fn6,__fn7,__fn8];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>[f.name,__implementations[f.index]])));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[__into0,null,null,null,null,null,null,null,null];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>[f.name,__intoImplementations[f.index]])));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}
