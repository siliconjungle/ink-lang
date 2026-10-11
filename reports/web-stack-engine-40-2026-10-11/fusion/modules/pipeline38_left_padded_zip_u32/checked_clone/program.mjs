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
const v21=v16;
const v22=v9;
const v23=v8;
const v24=v2;
const v25=v3;
/* inline right_word */
const v26=v22;
const v27=3;
let v28;if(v27===0 ){
v28=0;}else{
v28=((v26%v27)+0);}
const v29=v28;
const v30=0;
let v31;if(((v29) === (v30))){
const v32=v23;
const v33=v25;
v31=(Math.imul(v32,v33) >>> 0);}else{
const v34=v23;
const v35=v24;
v31=(((v34) + (v35)) >>> 0);}
const v36=v31;
const v37=v2;
const v38=v3;
/* inline pair_word */
const v39=v21;
const v40=v36;
let v41;if(((v39) < (v40))){
const v42=v21;
const v43=v36;
const v44=v38;
const v45=(Math.imul(v43,v44) >>> 0);
v41=(((v42) + (v45)) >>> 0);}else{
const v46=v21;
const v47=v36;
const v48=(((v46) - (v47)) >>> 0);
const v49=v37;
v41=(((v48) + (v49)) >>> 0);}
v6[v7]=v41;
}
return v6;}
function __fn1(v50,v51,v52,v53){
const v54=v50;
const v55=v52;
let v56;if(((v54) < (v55))){
const v57=v51;
const v58=v53;
v56=(((v57) + (v58)) >>> 0);}else{
const v59=v51;
const v60=v52;
v56=(((v59) - (v60)) >>> 0);}
return v56;}
function __fn2(v61,v62,v63,v64){
const v65=v61;
const v66=3;
let v67;if(v66===0 ){
v67=0;}else{
v67=((v65%v66)+0);}
const v68=v67;
const v69=0;
let v70;if(((v68) === (v69))){
const v71=v62;
const v72=v64;
v70=(Math.imul(v71,v72) >>> 0);}else{
const v73=v62;
const v74=v63;
v70=(((v73) + (v74)) >>> 0);}
return v70;}
function __fn3(v75,v76,v77,v78){
const v79=v75;
const v80=v76;
let v81;if(((v79) < (v80))){
const v82=v75;
const v83=v76;
const v84=v78;
const v85=(Math.imul(v83,v84) >>> 0);
v81=(((v82) + (v85)) >>> 0);}else{
const v86=v75;
const v87=v76;
const v88=(((v86) - (v87)) >>> 0);
const v89=v77;
v81=(((v88) + (v89)) >>> 0);}
return v81;}
function __into0(v90,v91,v92,v93,v94){
const v95=v90;
const v96=v95.length;
for(let v98=0;v98<v96;v98++){
const v99=v95[v98];
const v100=(v98>>>0);
const v101=v100;
const v102=v99;
const v103=v92;
const v104=v93;
/* inline left_word */
const v105=v101;
const v106=v103;
let v107;if(((v105) < (v106))){
const v108=v102;
const v109=v104;
v107=(((v108) + (v109)) >>> 0);}else{
const v110=v102;
const v111=v103;
v107=(((v110) - (v111)) >>> 0);}
const v112=v107;
const v113=v100;
const v114=v99;
const v115=v92;
const v116=v93;
/* inline right_word */
const v117=v113;
const v118=3;
let v119;if(v118===0 ){
v119=0;}else{
v119=((v117%v118)+0);}
const v120=v119;
const v121=0;
let v122;if(((v120) === (v121))){
const v123=v114;
const v124=v116;
v122=(Math.imul(v123,v124) >>> 0);}else{
const v125=v114;
const v126=v115;
v122=(((v125) + (v126)) >>> 0);}
const v127=v122;
const v128=v92;
const v129=v93;
/* inline pair_word */
const v130=v112;
const v131=v127;
let v132;if(((v130) < (v131))){
const v133=v112;
const v134=v127;
const v135=v129;
const v136=(Math.imul(v134,v135) >>> 0);
v132=(((v133) + (v136)) >>> 0);}else{
const v137=v112;
const v138=v127;
const v139=(((v137) - (v138)) >>> 0);
const v140=v128;
v132=(((v139) + (v140)) >>> 0);}
v94[v98]=v132;
}
return v96;}
const __namedTypes={};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v2","core_sha256":"0db3488540f41581b09c9e9d7d8cc8e88b196dfec2a78fc634dd84f6dc6e2826","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":0,"internal":false,"name":"pipeline38_left_padded_zip_u32","params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"element":{"kind":"u32"},"kind":"list"}},{"destination":null,"index":1,"internal":false,"name":"left_word","params":[{"name":"i","type":{"kind":"u32"}},{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":2,"internal":false,"name":"right_word","params":[{"name":"i","type":{"kind":"u32"}},{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":3,"internal":false,"name":"pair_word","params":[{"name":"a","type":{"kind":"u32"}},{"name":"b","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}}],"named_types":{},"schema":1,"state":null};
const __implementations=[__fn0,__fn1,__fn2,__fn3];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>[f.name,__implementations[f.index]])));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[__into0,null,null,null];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>[f.name,__intoImplementations[f.index]])));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}
