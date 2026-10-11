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
let v15;if(v14===0 ){
v15=0;}else{
v15=(Math.trunc(v13/v14)+0);}
const v16=v15;
const v17=v10;
const v18=v12;
let v19;if(v18===0 ){
v19=0;}else{
v19=((v17%v18)+0);}
const v20=v19;
const v21=(((v16) + (v20)) >>> 0);
const v22=v11;
v7[v8]=(((v21) + (v22)) >>> 0);
}
const v23=v7;
const v24=Math.min(v4.length,v23.length);
const v25=new Array(v24);
for(let v26=0;v26<v24;v26++){
const v27=v4[v26];
const v28=v23[v26];
const v29=v27;
const v30=v2;
const v31=v3;
/* inline selected_word */
const v32=v29;
const v33=v30;
let v34;if(((v32) < (v33))){
const v35=v29;
const v36=v31;
let v37;if(v36===0 ){
v37=0;}else{
v37=(Math.trunc(v35/v36)+0);}
const v38=v37;
const v39=v30;
v34=(((v38) + (v39)) >>> 0);}else{
const v40=v29;
const v41=v31;
let v42;if(v41===0 ){
v42=0;}else{
v42=((v40%v41)+0);}
const v43=v42;
const v44=v31;
v34=(((v43) + (v44)) >>> 0);}
v25[v26]=v34;
}
return v25;}
function __fn1(v45,v46,v47){
const v48=v45;
const v49=v46;
let v50;if(((v48) < (v49))){
const v51=v45;
const v52=v47;
let v53;if(v52===0 ){
v53=0;}else{
v53=(Math.trunc(v51/v52)+0);}
const v54=v53;
const v55=v46;
v50=(((v54) + (v55)) >>> 0);}else{
const v56=v45;
const v57=v47;
let v58;if(v57===0 ){
v58=0;}else{
v58=((v56%v57)+0);}
const v59=v58;
const v60=v47;
v50=(((v59) + (v60)) >>> 0);}
return v50;}
function __fn2(v61,v62,v63){
const v64=v61;
const v65=v63;
let v66;if(v65===0 ){
v66=0;}else{
v66=(Math.trunc(v64/v65)+0);}
const v67=v66;
const v68=v61;
const v69=v63;
let v70;if(v69===0 ){
v70=0;}else{
v70=((v68%v69)+0);}
const v71=v70;
const v72=(((v67) + (v71)) >>> 0);
const v73=v62;
return (((v72) + (v73)) >>> 0);}
function __into0(v74,v75,v76,v77,v78){
const v79=v74;
const v80=v75;
const v81=v80.length;
const v82=new Array(v81);
for(let v83=0;v83<v81;v83++){
const v84=v80[v83];
const v85=v84;
const v86=v76;
const v87=v77;
/* inline discarded_word */
const v88=v85;
const v89=v87;
let v90;if(v89===0 ){
v90=0;}else{
v90=(Math.trunc(v88/v89)+0);}
const v91=v90;
const v92=v85;
const v93=v87;
let v94;if(v93===0 ){
v94=0;}else{
v94=((v92%v93)+0);}
const v95=v94;
const v96=(((v91) + (v95)) >>> 0);
const v97=v86;
v82[v83]=(((v96) + (v97)) >>> 0);
}
const v98=v82;
const v99=Math.min(v79.length,v98.length);
for(let v101=0;v101<v99;v101++){
const v102=v79[v101];
const v103=v98[v101];
const v104=v102;
const v105=v76;
const v106=v77;
/* inline selected_word */
const v107=v104;
const v108=v105;
let v109;if(((v107) < (v108))){
const v110=v104;
const v111=v106;
let v112;if(v111===0 ){
v112=0;}else{
v112=(Math.trunc(v110/v111)+0);}
const v113=v112;
const v114=v105;
v109=(((v113) + (v114)) >>> 0);}else{
const v115=v104;
const v116=v106;
let v117;if(v116===0 ){
v117=0;}else{
v117=((v115%v116)+0);}
const v118=v117;
const v119=v106;
v109=(((v118) + (v119)) >>> 0);}
v78[v101]=v109;
}
return v99;}
const __namedTypes={};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v2","core_sha256":"7e3e71b7631308baab0cd63ae8786662ab57ef1bad9e3c3adb850fff30786560","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":0,"internal":false,"name":"pipeline33_right_projection_heldout_u32","params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"element":{"kind":"u32"},"kind":"list"}},{"destination":null,"index":1,"internal":false,"name":"selected_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":2,"internal":false,"name":"discarded_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}}],"named_types":{},"schema":1,"state":null};
const __implementations=[__fn0,__fn1,__fn2];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>[f.name,__implementations[f.index]])));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[__into0,null,null];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>[f.name,__intoImplementations[f.index]])));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}
