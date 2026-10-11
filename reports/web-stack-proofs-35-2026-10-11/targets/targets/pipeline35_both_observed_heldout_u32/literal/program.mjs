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
const v23=v22.length;
const v24=new Array(v23);
for(let v25=0;v25<v23;v25++){
const v26=v22[v25];
const v27=v26;
const v28=v2;
const v29=v3;
/* inline right_word */
const v30=v27;
const v31=v29;
/* inline normalize_right */
const v32=v30;
const v33=v31;
let v34;if(v33===0 ){
v34=0;}else{
v34=((v32%v33)+0);}
const v35=v34;
const v36=v30;
const v37=(((v35) + (v36)) >>> 0);
const v38=v29;
v24[v25]=(((v37) + (v38)) >>> 0);
}
const v39=v24;
const v40=Math.min(v21.length,v39.length);
const v41=new Array(v40);
for(let v42=0;v42<v40;v42++){
const v43=v21[v42];
const v44=v39[v42];
const v45=v43;
const v46=v44;
const v47=v2;
const v48=v3;
/* inline combine_words */
const v49=v45;
const v50=v46;
const v51=v47;
const v52=v48;
/* inline mix_words */
const v53=v49;
const v54=v51;
let v55;if(((v53) < (v54))){
const v56=v49;
const v57=v50;
const v58=(((v56) + (v57)) >>> 0);
const v59=v52;
v55=(Math.imul(v58,v59) >>> 0);}else{
const v60=v49;
const v61=v50;
const v62=(((v60) - (v61)) >>> 0);
const v63=v51;
v55=(((v62) + (v63)) >>> 0);}
v41[v42]=v55;
}
return v41;}
function __fn1(v64,v65,v66){
const v67=v64;
const v68=v66;
/* inline normalize_left */
const v69=v67;
const v70=v68;
let v71;if(v70===0 ){
v71=0;}else{
v71=(Math.trunc(v69/v70)+0);}
const v72=v71;
const v73=v67;
const v74=(((v72) + (v73)) >>> 0);
const v75=v65;
return (((v74) + (v75)) >>> 0);}
function __fn2(v76,v77){
const v78=v76;
const v79=v77;
let v80;if(v79===0 ){
v80=0;}else{
v80=(Math.trunc(v78/v79)+0);}
const v81=v80;
const v82=v76;
return (((v81) + (v82)) >>> 0);}
function __fn3(v83,v84,v85){
const v86=v83;
const v87=v85;
/* inline normalize_right */
const v88=v86;
const v89=v87;
let v90;if(v89===0 ){
v90=0;}else{
v90=((v88%v89)+0);}
const v91=v90;
const v92=v86;
const v93=(((v91) + (v92)) >>> 0);
const v94=v85;
return (((v93) + (v94)) >>> 0);}
function __fn4(v95,v96){
const v97=v95;
const v98=v96;
let v99;if(v98===0 ){
v99=0;}else{
v99=((v97%v98)+0);}
const v100=v99;
const v101=v95;
return (((v100) + (v101)) >>> 0);}
function __fn5(v102,v103,v104,v105){
const v106=v102;
const v107=v103;
const v108=v104;
const v109=v105;
/* inline mix_words */
const v110=v106;
const v111=v108;
let v112;if(((v110) < (v111))){
const v113=v106;
const v114=v107;
const v115=(((v113) + (v114)) >>> 0);
const v116=v109;
v112=(Math.imul(v115,v116) >>> 0);}else{
const v117=v106;
const v118=v107;
const v119=(((v117) - (v118)) >>> 0);
const v120=v108;
v112=(((v119) + (v120)) >>> 0);}
return v112;}
function __fn6(v121,v122,v123,v124){
const v125=v121;
const v126=v123;
let v127;if(((v125) < (v126))){
const v128=v121;
const v129=v122;
const v130=(((v128) + (v129)) >>> 0);
const v131=v124;
v127=(Math.imul(v130,v131) >>> 0);}else{
const v132=v121;
const v133=v122;
const v134=(((v132) - (v133)) >>> 0);
const v135=v123;
v127=(((v134) + (v135)) >>> 0);}
return v127;}
function __into0(v136,v137,v138,v139,v140){
const v141=v136;
const v142=v141.length;
const v143=new Array(v142);
for(let v144=0;v144<v142;v144++){
const v145=v141[v144];
const v146=v145;
const v147=v138;
const v148=v139;
/* inline left_word */
const v149=v146;
const v150=v148;
/* inline normalize_left */
const v151=v149;
const v152=v150;
let v153;if(v152===0 ){
v153=0;}else{
v153=(Math.trunc(v151/v152)+0);}
const v154=v153;
const v155=v149;
const v156=(((v154) + (v155)) >>> 0);
const v157=v147;
v143[v144]=(((v156) + (v157)) >>> 0);
}
const v158=v143;
const v159=v137;
const v160=v159.length;
const v161=new Array(v160);
for(let v162=0;v162<v160;v162++){
const v163=v159[v162];
const v164=v163;
const v165=v138;
const v166=v139;
/* inline right_word */
const v167=v164;
const v168=v166;
/* inline normalize_right */
const v169=v167;
const v170=v168;
let v171;if(v170===0 ){
v171=0;}else{
v171=((v169%v170)+0);}
const v172=v171;
const v173=v167;
const v174=(((v172) + (v173)) >>> 0);
const v175=v166;
v161[v162]=(((v174) + (v175)) >>> 0);
}
const v176=v161;
const v177=Math.min(v158.length,v176.length);
for(let v179=0;v179<v177;v179++){
const v180=v158[v179];
const v181=v176[v179];
const v182=v180;
const v183=v181;
const v184=v138;
const v185=v139;
/* inline combine_words */
const v186=v182;
const v187=v183;
const v188=v184;
const v189=v185;
/* inline mix_words */
const v190=v186;
const v191=v188;
let v192;if(((v190) < (v191))){
const v193=v186;
const v194=v187;
const v195=(((v193) + (v194)) >>> 0);
const v196=v189;
v192=(Math.imul(v195,v196) >>> 0);}else{
const v197=v186;
const v198=v187;
const v199=(((v197) - (v198)) >>> 0);
const v200=v188;
v192=(((v199) + (v200)) >>> 0);}
v140[v179]=v192;
}
return v177;}
const __namedTypes={};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v2","core_sha256":"150c56156221b367d6b5274b1f95143cad6c85dafb36b28677dbdc421e40d447","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":0,"internal":false,"name":"pipeline35_both_observed_heldout_u32","params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"element":{"kind":"u32"},"kind":"list"}},{"destination":null,"index":1,"internal":false,"name":"left_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":2,"internal":false,"name":"normalize_left","params":[{"name":"x","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":3,"internal":false,"name":"right_word","params":[{"name":"y","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":4,"internal":false,"name":"normalize_right","params":[{"name":"y","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":5,"internal":false,"name":"combine_words","params":[{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":6,"internal":false,"name":"mix_words","params":[{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}}],"named_types":{},"schema":1,"state":null};
const __implementations=[__fn0,__fn1,__fn2,__fn3,__fn4,__fn5,__fn6];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>[f.name,__implementations[f.index]])));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[__into0,null,null,null,null,null,null];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>[f.name,__intoImplementations[f.index]])));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}
