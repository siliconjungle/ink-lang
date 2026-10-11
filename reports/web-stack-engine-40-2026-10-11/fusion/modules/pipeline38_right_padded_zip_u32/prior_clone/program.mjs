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
const v15=v12;
let v16;if(((v14) < (v15))){
const v17=v11;
const v18=v13;
v16=(((v17) + (v18)) >>> 0);}else{
const v19=v11;
const v20=v12;
v16=(((v19) - (v20)) >>> 0);}
v6[v7]=v16;
}
const v21=v6;
const v22=v0;
const v23=v22.length;
const v24=new Array(v23);
for(let v25=0;v25<v23;v25++){
const v26=v22[v25];
const v27=(v25>>>0);
const v28=v27;
const v29=v26;
const v30=v2;
const v31=v3;
/* inline right_word */
const v32=v28;
const v33=3;
let v34;if(v33===0 ){
v34=0;}else{
v34=((v32%v33)+0);}
const v35=v34;
const v36=0;
let v37;if(((v35) === (v36))){
const v38=v29;
const v39=v31;
v37=(Math.imul(v38,v39) >>> 0);}else{
const v40=v29;
const v41=v30;
v37=(((v40) + (v41)) >>> 0);}
v24[v25]=v37;
}
const v42=v24;
const v43=v1;
const v44=v42.length;
const v45=v43.length;
const v46=new Array(v44+v45);
for(let v47=0;v47<v44;v47++){v46[v47]=v42[v47];}
for(let v48=0;v48<v45;v48++){v46[v44+v48]=v43[v48];}
const v49=v46;
const v50=Math.min(v21.length,v49.length);
const v51=new Array(v50);
for(let v52=0;v52<v50;v52++){
const v53=v21[v52];
const v54=v49[v52];
const v55=v53;
const v56=v54;
const v57=v2;
const v58=v3;
/* inline pair_word */
const v59=v55;
const v60=v56;
let v61;if(((v59) < (v60))){
const v62=v55;
const v63=v56;
const v64=v58;
const v65=(Math.imul(v63,v64) >>> 0);
v61=(((v62) + (v65)) >>> 0);}else{
const v66=v55;
const v67=v56;
const v68=(((v66) - (v67)) >>> 0);
const v69=v57;
v61=(((v68) + (v69)) >>> 0);}
v51[v52]=v61;
}
return v51;}
function __fn1(v70,v71,v72,v73){
const v74=v70;
const v75=v72;
let v76;if(((v74) < (v75))){
const v77=v71;
const v78=v73;
v76=(((v77) + (v78)) >>> 0);}else{
const v79=v71;
const v80=v72;
v76=(((v79) - (v80)) >>> 0);}
return v76;}
function __fn2(v81,v82,v83,v84){
const v85=v81;
const v86=3;
let v87;if(v86===0 ){
v87=0;}else{
v87=((v85%v86)+0);}
const v88=v87;
const v89=0;
let v90;if(((v88) === (v89))){
const v91=v82;
const v92=v84;
v90=(Math.imul(v91,v92) >>> 0);}else{
const v93=v82;
const v94=v83;
v90=(((v93) + (v94)) >>> 0);}
return v90;}
function __fn3(v95,v96,v97,v98){
const v99=v95;
const v100=v96;
let v101;if(((v99) < (v100))){
const v102=v95;
const v103=v96;
const v104=v98;
const v105=(Math.imul(v103,v104) >>> 0);
v101=(((v102) + (v105)) >>> 0);}else{
const v106=v95;
const v107=v96;
const v108=(((v106) - (v107)) >>> 0);
const v109=v97;
v101=(((v108) + (v109)) >>> 0);}
return v101;}
function __into0(v110,v111,v112,v113,v114){
const v115=v110;
const v116=v115.length;
const v117=new Array(v116);
for(let v118=0;v118<v116;v118++){
const v119=v115[v118];
const v120=(v118>>>0);
const v121=v120;
const v122=v119;
const v123=v112;
const v124=v113;
/* inline left_word */
const v125=v121;
const v126=v123;
let v127;if(((v125) < (v126))){
const v128=v122;
const v129=v124;
v127=(((v128) + (v129)) >>> 0);}else{
const v130=v122;
const v131=v123;
v127=(((v130) - (v131)) >>> 0);}
v117[v118]=v127;
}
const v132=v117;
const v133=v110;
const v134=v133.length;
const v135=new Array(v134);
for(let v136=0;v136<v134;v136++){
const v137=v133[v136];
const v138=(v136>>>0);
const v139=v138;
const v140=v137;
const v141=v112;
const v142=v113;
/* inline right_word */
const v143=v139;
const v144=3;
let v145;if(v144===0 ){
v145=0;}else{
v145=((v143%v144)+0);}
const v146=v145;
const v147=0;
let v148;if(((v146) === (v147))){
const v149=v140;
const v150=v142;
v148=(Math.imul(v149,v150) >>> 0);}else{
const v151=v140;
const v152=v141;
v148=(((v151) + (v152)) >>> 0);}
v135[v136]=v148;
}
const v153=v135;
const v154=v111;
const v155=v153.length;
const v156=v154.length;
const v157=new Array(v155+v156);
for(let v158=0;v158<v155;v158++){v157[v158]=v153[v158];}
for(let v159=0;v159<v156;v159++){v157[v155+v159]=v154[v159];}
const v160=v157;
const v161=Math.min(v132.length,v160.length);
for(let v163=0;v163<v161;v163++){
const v164=v132[v163];
const v165=v160[v163];
const v166=v164;
const v167=v165;
const v168=v112;
const v169=v113;
/* inline pair_word */
const v170=v166;
const v171=v167;
let v172;if(((v170) < (v171))){
const v173=v166;
const v174=v167;
const v175=v169;
const v176=(Math.imul(v174,v175) >>> 0);
v172=(((v173) + (v176)) >>> 0);}else{
const v177=v166;
const v178=v167;
const v179=(((v177) - (v178)) >>> 0);
const v180=v168;
v172=(((v179) + (v180)) >>> 0);}
v114[v163]=v172;
}
return v161;}
const __namedTypes={};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v4","core_sha256":"266bf4b07ec8162e7807e72d55c3e888f2d15e9a60e7c523a310793708e6cf20","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":0,"internal":false,"name":"pipeline38_right_padded_zip_u32","params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"element":{"kind":"u32"},"kind":"list"}},{"destination":null,"index":1,"internal":false,"name":"left_word","params":[{"name":"i","type":{"kind":"u32"}},{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":2,"internal":false,"name":"right_word","params":[{"name":"i","type":{"kind":"u32"}},{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":3,"internal":false,"name":"pair_word","params":[{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}}],"named_types":{},"schema":1,"state":null};
const __implementations=[__fn0,__fn1,__fn2,__fn3];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>[f.name,__implementations[f.index]])));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[__into0,null,null,null];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>[f.name,__intoImplementations[f.index]])));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}
