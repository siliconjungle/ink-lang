function __fn0(v0,v1,v2,v3){
const v4=v0;
const v5=v4.length;
const v6=[];
for(let v7=0;v7<v5;v7++){
const v8=v4[v7];
const v9=v8;
const v10=v2;
const v11=v3;
/* inline accepts_word */
const v12=v9;
const v13=v10;
const v14=v11;
/* inline acceptance_test */
const v15=v12;
const v16=v14;
let v17;if(v16===0 ){
v17=0;}else{
v17=((v15%v16)+0);}
const v18=v17;
const v19=v13;
if(((v18) < (v19))){v6.push(v8);}
}
const v20=v6;
const v21=v20.length;
const v22=new Array(v21);
for(let v23=0;v23<v21;v23++){
const v24=v20[v23];
const v25=v24;
const v26=v2;
const v27=v3;
/* inline left_word */
const v28=v25;
const v29=v27;
/* inline calibrate_left */
const v30=v28;
const v31=v29;
let v32;if(v31===0 ){
v32=0;}else{
v32=(Math.trunc(v30/v31)+0);}
const v33=v32;
const v34=v26;
v22[v23]=(((v33) + (v34)) >>> 0);
}
const v35=v22;
let v36=v2;
for(let v37=v35.length-1;v37>=0;v37--){
const v38=v35[v37];
const v39=v38;
const v40=v36;
const v41=v2;
const v42=v3;
/* inline reduce_word */
const v43=v39;
const v44=v40;
const v45=v41;
const v46=v42;
/* inline mix_word */
const v47=v44;
const v48=v45;
let v49;if(((v47) < (v48))){
const v50=v43;
const v51=v44;
const v52=v46;
const v53=(Math.imul(v51,v52) >>> 0);
v49=(((v50) + (v53)) >>> 0);}else{
const v54=v43;
const v55=v44;
v49=(((v54) - (v55)) >>> 0);}
v36=v49;
}
return v36;}
function __fn1(v56,v57,v58){
const v59=v56;
const v60=v58;
/* inline calibrate_left */
const v61=v59;
const v62=v60;
let v63;if(v62===0 ){
v63=0;}else{
v63=(Math.trunc(v61/v62)+0);}
const v64=v63;
const v65=v57;
return (((v64) + (v65)) >>> 0);}
function __fn2(v66,v67){
const v68=v66;
const v69=v67;
let v70;if(v69===0 ){
v70=0;}else{
v70=(Math.trunc(v68/v69)+0);}
return v70;}
function __fn3(v71,v72,v73){
const v74=v71;
const v75=v73;
/* inline calibrate_right */
const v76=v74;
const v77=v75;
let v78;if(v77===0 ){
v78=0;}else{
v78=((v76%v77)+0);}
const v79=v78;
const v80=v73;
return (((v79) + (v80)) >>> 0);}
function __fn4(v81,v82){
const v83=v81;
const v84=v82;
let v85;if(v84===0 ){
v85=0;}else{
v85=((v83%v84)+0);}
return v85;}
function __fn5(v86,v87,v88,v89){
const v90=v86;
const v91=v87;
const v92=v88;
const v93=v89;
/* inline mix_word */
const v94=v91;
const v95=v92;
let v96;if(((v94) < (v95))){
const v97=v90;
const v98=v91;
const v99=v93;
const v100=(Math.imul(v98,v99) >>> 0);
v96=(((v97) + (v100)) >>> 0);}else{
const v101=v90;
const v102=v91;
v96=(((v101) - (v102)) >>> 0);}
return v96;}
function __fn6(v103,v104,v105,v106){
const v107=v104;
const v108=v105;
let v109;if(((v107) < (v108))){
const v110=v103;
const v111=v104;
const v112=v106;
const v113=(Math.imul(v111,v112) >>> 0);
v109=(((v110) + (v113)) >>> 0);}else{
const v114=v103;
const v115=v104;
v109=(((v114) - (v115)) >>> 0);}
return v109;}
function __fn7(v116,v117,v118){
const v119=v116;
const v120=v117;
const v121=v118;
/* inline acceptance_test */
const v122=v119;
const v123=v121;
let v124;if(v123===0 ){
v124=0;}else{
v124=((v122%v123)+0);}
const v125=v124;
const v126=v120;
return ((v125) < (v126));}
function __fn8(v127,v128,v129){
const v130=v127;
const v131=v129;
let v132;if(v131===0 ){
v132=0;}else{
v132=((v130%v131)+0);}
const v133=v132;
const v134=v128;
return ((v133) < (v134));}
const __namedTypes={};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v2","core_sha256":"42a8fdde2dbdd21a2a053ea75a492c8846397ba20e36f8fcd736e088005a1dbc","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":null,"index":0,"internal":false,"name":"pipeline36_filtered_ordered_heldout_u32","params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":1,"internal":false,"name":"left_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":2,"internal":false,"name":"calibrate_left","params":[{"name":"x","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":3,"internal":false,"name":"right_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":4,"internal":false,"name":"calibrate_right","params":[{"name":"x","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":5,"internal":false,"name":"reduce_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"acc","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":6,"internal":false,"name":"mix_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"acc","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":7,"internal":false,"name":"accepts_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"bool"}},{"destination":null,"index":8,"internal":false,"name":"acceptance_test","params":[{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"bool"}}],"named_types":{},"schema":1,"state":null};
const __implementations=[__fn0,__fn1,__fn2,__fn3,__fn4,__fn5,__fn6,__fn7,__fn8];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>[f.name,__implementations[f.index]])));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[null,null,null,null,null,null,null,null,null];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>[f.name,__intoImplementations[f.index]])));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}
