function __fn0(v0,v1,v2,v3){
const v4=v0;
const v5=v1;
const v6=v5.length;
const v7=new Array(v6);
for(let v8=0;v8<v6;v8++){
const v9=v5[v8];
const v10=v9;
const v11=v2;
const v12=v3;
/* inline discarded_word */
const v13=v10;
const v14=v12;
/* inline calibrate_word */
const v15=v13;
const v16=v14;
let v17;if(v16===0 ){
v17=0;}else{
v17=(Math.trunc(v15/v16)+0);}
const v18=v17;
const v19=v13;
const v20=v14;
let v21;if(v20===0 ){
v21=0;}else{
v21=((v19%v20)+0);}
const v22=v21;
const v23=(((v18) + (v22)) >>> 0);
const v24=v11;
v7[v8]=(((v23) + (v24)) >>> 0);
}
const v25=v7;
const v26=Math.min(v4.length,v25.length);
const v27=new Array(v26);
for(let v28=0;v28<v26;v28++){
const v29=v4[v28];
const v30=v25[v28];
const v31=v29;
const v32=v2;
const v33=v3;
/* inline selected_word */
const v34=v31;
const v35=v32;
const v36=v33;
/* inline repair_word */
const v37=v34;
const v38=v35;
let v39;if(((v37) < (v38))){
const v40=v34;
const v41=v36;
v39=(((v40) + (v41)) >>> 0);}else{
const v42=v34;
const v43=v36;
v39=(((v42) - (v43)) >>> 0);}
v27[v28]=v39;
}
return v27;}
function __fn1(v44,v45,v46){
const v47=v44;
const v48=v46;
/* inline calibrate_word */
const v49=v47;
const v50=v48;
let v51;if(v50===0 ){
v51=0;}else{
v51=(Math.trunc(v49/v50)+0);}
const v52=v51;
const v53=v47;
const v54=v48;
let v55;if(v54===0 ){
v55=0;}else{
v55=((v53%v54)+0);}
const v56=v55;
const v57=(((v52) + (v56)) >>> 0);
const v58=v45;
return (((v57) + (v58)) >>> 0);}
function __fn2(v59,v60){
const v61=v59;
const v62=v60;
let v63;if(v62===0 ){
v63=0;}else{
v63=(Math.trunc(v61/v62)+0);}
const v64=v63;
const v65=v59;
const v66=v60;
let v67;if(v66===0 ){
v67=0;}else{
v67=((v65%v66)+0);}
const v68=v67;
return (((v64) + (v68)) >>> 0);}
function __fn3(v69,v70,v71){
const v72=v69;
const v73=v70;
const v74=v71;
/* inline repair_word */
const v75=v72;
const v76=v73;
let v77;if(((v75) < (v76))){
const v78=v72;
const v79=v74;
v77=(((v78) + (v79)) >>> 0);}else{
const v80=v72;
const v81=v74;
v77=(((v80) - (v81)) >>> 0);}
return v77;}
function __fn4(v82,v83,v84){
const v85=v82;
const v86=v83;
let v87;if(((v85) < (v86))){
const v88=v82;
const v89=v84;
v87=(((v88) + (v89)) >>> 0);}else{
const v90=v82;
const v91=v84;
v87=(((v90) - (v91)) >>> 0);}
return v87;}
function __into0(v92,v93,v94,v95,v96){
const v97=v92;
const v98=v93;
const v99=v98.length;
const v100=new Array(v99);
for(let v101=0;v101<v99;v101++){
const v102=v98[v101];
const v103=v102;
const v104=v94;
const v105=v95;
/* inline discarded_word */
const v106=v103;
const v107=v105;
/* inline calibrate_word */
const v108=v106;
const v109=v107;
let v110;if(v109===0 ){
v110=0;}else{
v110=(Math.trunc(v108/v109)+0);}
const v111=v110;
const v112=v106;
const v113=v107;
let v114;if(v113===0 ){
v114=0;}else{
v114=((v112%v113)+0);}
const v115=v114;
const v116=(((v111) + (v115)) >>> 0);
const v117=v104;
v100[v101]=(((v116) + (v117)) >>> 0);
}
const v118=v100;
const v119=Math.min(v97.length,v118.length);
for(let v121=0;v121<v119;v121++){
const v122=v97[v121];
const v123=v118[v121];
const v124=v122;
const v125=v94;
const v126=v95;
/* inline selected_word */
const v127=v124;
const v128=v125;
const v129=v126;
/* inline repair_word */
const v130=v127;
const v131=v128;
let v132;if(((v130) < (v131))){
const v133=v127;
const v134=v129;
v132=(((v133) + (v134)) >>> 0);}else{
const v135=v127;
const v136=v129;
v132=(((v135) - (v136)) >>> 0);}
v96[v121]=v132;
}
return v119;}
const __namedTypes={};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v2","core_sha256":"81404d295c13e9c2cc73190b56179ae1f2a1b9afa5fa90377b94572035738cfc","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":0,"internal":false,"name":"pipeline34_right_projection_u32","params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"element":{"kind":"u32"},"kind":"list"}},{"destination":null,"index":1,"internal":false,"name":"discarded_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":2,"internal":false,"name":"calibrate_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":3,"internal":false,"name":"selected_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":4,"internal":false,"name":"repair_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}}],"named_types":{},"schema":1,"state":null};
const __implementations=[__fn0,__fn1,__fn2,__fn3,__fn4];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>[f.name,__implementations[f.index]])));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[__into0,null,null,null,null];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>[f.name,__intoImplementations[f.index]])));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}
