function __fn0(v0,v1,v2,v3){
const v4=v0;
const v5=v1;
const v6=Math.min(v4.length,v5.length);
const v7=new Array(v6);
for(let v8=0;v8<v6;v8++){
const v9=v4[v8];
const v10=v5[v8];
const v11=v9;
const v12=v10;
const v13=v2;
const v14=v3;
/* inline right_word */
const v15=v12;
const v16=v14;
/* inline normalize_right */
const v17=v15;
const v18=v16;
let v19;if(v18===0 ){
v19=0;}else{
v19=((v17%v18)+0);}
const v20=v19;
const v21=v15;
const v22=(((v20) + (v21)) >>> 0);
const v23=v14;
const v24=(((v22) + (v23)) >>> 0);
const v25=v2;
const v26=v3;
/* inline combine_words */
const v27=v11;
const v28=v24;
const v29=v25;
const v30=v26;
/* inline mix_words */
const v31=v27;
const v32=v28;
let v33;if(((v31) < (v32))){
const v34=v27;
const v35=v28;
const v36=v30;
const v37=(Math.imul(v35,v36) >>> 0);
v33=(((v34) + (v37)) >>> 0);}else{
const v38=v27;
const v39=v28;
const v40=v30;
const v41=(Math.imul(v39,v40) >>> 0);
v33=(((v38) - (v41)) >>> 0);}
const v42=v33;
const v43=v29;
v7[v8]=(((v42) + (v43)) >>> 0);
}
return v7;}
function __fn1(v44,v45,v46){
const v47=v44;
const v48=v46;
/* inline normalize_left */
const v49=v47;
const v50=v48;
let v51;if(v50===0 ){
v51=0;}else{
v51=(Math.trunc(v49/v50)+0);}
const v52=v51;
const v53=v47;
const v54=(((v52) + (v53)) >>> 0);
const v55=v45;
return (((v54) + (v55)) >>> 0);}
function __fn2(v56,v57){
const v58=v56;
const v59=v57;
let v60;if(v59===0 ){
v60=0;}else{
v60=(Math.trunc(v58/v59)+0);}
const v61=v60;
const v62=v56;
return (((v61) + (v62)) >>> 0);}
function __fn3(v63,v64,v65){
const v66=v63;
const v67=v65;
/* inline normalize_right */
const v68=v66;
const v69=v67;
let v70;if(v69===0 ){
v70=0;}else{
v70=((v68%v69)+0);}
const v71=v70;
const v72=v66;
const v73=(((v71) + (v72)) >>> 0);
const v74=v65;
return (((v73) + (v74)) >>> 0);}
function __fn4(v75,v76){
const v77=v75;
const v78=v76;
let v79;if(v78===0 ){
v79=0;}else{
v79=((v77%v78)+0);}
const v80=v79;
const v81=v75;
return (((v80) + (v81)) >>> 0);}
function __fn5(v82,v83,v84,v85){
const v86=v82;
const v87=v83;
const v88=v84;
const v89=v85;
/* inline mix_words */
const v90=v86;
const v91=v87;
let v92;if(((v90) < (v91))){
const v93=v86;
const v94=v87;
const v95=v89;
const v96=(Math.imul(v94,v95) >>> 0);
v92=(((v93) + (v96)) >>> 0);}else{
const v97=v86;
const v98=v87;
const v99=v89;
const v100=(Math.imul(v98,v99) >>> 0);
v92=(((v97) - (v100)) >>> 0);}
const v101=v92;
const v102=v88;
return (((v101) + (v102)) >>> 0);}
function __fn6(v103,v104,v105,v106){
const v107=v103;
const v108=v104;
let v109;if(((v107) < (v108))){
const v110=v103;
const v111=v104;
const v112=v106;
const v113=(Math.imul(v111,v112) >>> 0);
v109=(((v110) + (v113)) >>> 0);}else{
const v114=v103;
const v115=v104;
const v116=v106;
const v117=(Math.imul(v115,v116) >>> 0);
v109=(((v114) - (v117)) >>> 0);}
const v118=v109;
const v119=v105;
return (((v118) + (v119)) >>> 0);}
function __into0(v120,v121,v122,v123,v124){
const v125=v120;
const v126=v121;
const v127=Math.min(v125.length,v126.length);
for(let v129=0;v129<v127;v129++){
const v130=v125[v129];
const v131=v126[v129];
const v132=v130;
const v133=v131;
const v134=v122;
const v135=v123;
/* inline right_word */
const v136=v133;
const v137=v135;
/* inline normalize_right */
const v138=v136;
const v139=v137;
let v140;if(v139===0 ){
v140=0;}else{
v140=((v138%v139)+0);}
const v141=v140;
const v142=v136;
const v143=(((v141) + (v142)) >>> 0);
const v144=v135;
const v145=(((v143) + (v144)) >>> 0);
const v146=v122;
const v147=v123;
/* inline combine_words */
const v148=v132;
const v149=v145;
const v150=v146;
const v151=v147;
/* inline mix_words */
const v152=v148;
const v153=v149;
let v154;if(((v152) < (v153))){
const v155=v148;
const v156=v149;
const v157=v151;
const v158=(Math.imul(v156,v157) >>> 0);
v154=(((v155) + (v158)) >>> 0);}else{
const v159=v148;
const v160=v149;
const v161=v151;
const v162=(Math.imul(v160,v161) >>> 0);
v154=(((v159) - (v162)) >>> 0);}
const v163=v154;
const v164=v150;
v124[v129]=(((v163) + (v164)) >>> 0);
}
return v127;}
const __namedTypes={};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v2","core_sha256":"01c973c02610210cf4d5428edd0ea0fc55bbf791b7463e7dad9192c5260afd23","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":0,"internal":false,"name":"pipeline35_right_observed_u32","params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"element":{"kind":"u32"},"kind":"list"}},{"destination":null,"index":1,"internal":false,"name":"left_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":2,"internal":false,"name":"normalize_left","params":[{"name":"x","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":3,"internal":false,"name":"right_word","params":[{"name":"y","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":4,"internal":false,"name":"normalize_right","params":[{"name":"y","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":5,"internal":false,"name":"combine_words","params":[{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":6,"internal":false,"name":"mix_words","params":[{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}}],"named_types":{},"schema":1,"state":null};
const __implementations=[__fn0,__fn1,__fn2,__fn3,__fn4,__fn5,__fn6];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>[f.name,__implementations[f.index]])));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[__into0,null,null,null,null,null,null];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>[f.name,__intoImplementations[f.index]])));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}
