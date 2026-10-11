function __fn0(v0,v1,v2,v3){
const v4=v0;
let v5=v2;
for(let v6=v4.length-1;v6>=0;v6--){
const v7=v4[v6];
const v8=v7;
const v9=v2;
const v10=v3;
/* inline accepts_word */
const v11=v8;
const v12=v9;
const v13=v10;
/* inline acceptance_test */
const v14=v11;
const v15=v13;
let v16;if(v15===0 ){
v16=0;}else{
v16=((v14%v15)+0);}
const v17=v16;
const v18=v12;
let v19;if(((v17) < (v18))){
const v20=v7;
const v21=v2;
const v22=v3;
/* inline left_word */
const v23=v20;
const v24=v22;
/* inline calibrate_left */
const v25=v23;
const v26=v24;
let v27;if(v26===0 ){
v27=0;}else{
v27=(Math.trunc(v25/v26)+0);}
const v28=v27;
const v29=v21;
const v30=(((v28) + (v29)) >>> 0);
const v31=v5;
const v32=v2;
const v33=v3;
/* inline reduce_word */
const v34=v30;
const v35=v31;
const v36=v32;
const v37=v33;
/* inline mix_word */
const v38=v35;
const v39=v36;
let v40;if(((v38) < (v39))){
const v41=v34;
const v42=v35;
const v43=v37;
const v44=(Math.imul(v42,v43) >>> 0);
v40=(((v41) + (v44)) >>> 0);}else{
const v45=v34;
const v46=v35;
v40=(((v45) - (v46)) >>> 0);}
v19=v40;}else{
v19=v5;}
v5=v19;
}
return v5;}
function __fn1(v47,v48,v49){
const v50=v47;
const v51=v49;
/* inline calibrate_left */
const v52=v50;
const v53=v51;
let v54;if(v53===0 ){
v54=0;}else{
v54=(Math.trunc(v52/v53)+0);}
const v55=v54;
const v56=v48;
return (((v55) + (v56)) >>> 0);}
function __fn2(v57,v58){
const v59=v57;
const v60=v58;
let v61;if(v60===0 ){
v61=0;}else{
v61=(Math.trunc(v59/v60)+0);}
return v61;}
function __fn3(v62,v63,v64){
const v65=v62;
const v66=v64;
/* inline calibrate_right */
const v67=v65;
const v68=v66;
let v69;if(v68===0 ){
v69=0;}else{
v69=((v67%v68)+0);}
const v70=v69;
const v71=v64;
return (((v70) + (v71)) >>> 0);}
function __fn4(v72,v73){
const v74=v72;
const v75=v73;
let v76;if(v75===0 ){
v76=0;}else{
v76=((v74%v75)+0);}
return v76;}
function __fn5(v77,v78,v79,v80){
const v81=v77;
const v82=v78;
const v83=v79;
const v84=v80;
/* inline mix_word */
const v85=v82;
const v86=v83;
let v87;if(((v85) < (v86))){
const v88=v81;
const v89=v82;
const v90=v84;
const v91=(Math.imul(v89,v90) >>> 0);
v87=(((v88) + (v91)) >>> 0);}else{
const v92=v81;
const v93=v82;
v87=(((v92) - (v93)) >>> 0);}
return v87;}
function __fn6(v94,v95,v96,v97){
const v98=v95;
const v99=v96;
let v100;if(((v98) < (v99))){
const v101=v94;
const v102=v95;
const v103=v97;
const v104=(Math.imul(v102,v103) >>> 0);
v100=(((v101) + (v104)) >>> 0);}else{
const v105=v94;
const v106=v95;
v100=(((v105) - (v106)) >>> 0);}
return v100;}
function __fn7(v107,v108,v109){
const v110=v107;
const v111=v108;
const v112=v109;
/* inline acceptance_test */
const v113=v110;
const v114=v112;
let v115;if(v114===0 ){
v115=0;}else{
v115=((v113%v114)+0);}
const v116=v115;
const v117=v111;
return ((v116) < (v117));}
function __fn8(v118,v119,v120){
const v121=v118;
const v122=v120;
let v123;if(v122===0 ){
v123=0;}else{
v123=((v121%v122)+0);}
const v124=v123;
const v125=v119;
return ((v124) < (v125));}
const __namedTypes={};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v2","core_sha256":"8c0b30280df9d96468659dc1be0a16fc7b382208ad07d4d4a6e8ee6d63c02e79","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":null,"index":0,"internal":false,"name":"pipeline36_filtered_ordered_heldout_u32","params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":1,"internal":false,"name":"left_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":2,"internal":false,"name":"calibrate_left","params":[{"name":"x","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":3,"internal":false,"name":"right_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":4,"internal":false,"name":"calibrate_right","params":[{"name":"x","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":5,"internal":false,"name":"reduce_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"acc","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":6,"internal":false,"name":"mix_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"acc","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":7,"internal":false,"name":"accepts_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"bool"}},{"destination":null,"index":8,"internal":false,"name":"acceptance_test","params":[{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"bool"}}],"named_types":{},"schema":1,"state":null};
const __implementations=[__fn0,__fn1,__fn2,__fn3,__fn4,__fn5,__fn6,__fn7,__fn8];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>[f.name,__implementations[f.index]])));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[null,null,null,null,null,null,null,null,null];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>[f.name,__intoImplementations[f.index]])));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}
