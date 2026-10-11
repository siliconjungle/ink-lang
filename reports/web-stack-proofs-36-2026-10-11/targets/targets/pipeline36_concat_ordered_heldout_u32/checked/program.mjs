function __fn0(v0,v1,v2,v3){
const v4=v0;
const v5=v1;
let v6=v2;
for(let v7=v5.length-1;v7>=0;v7--){
const v8=v5[v7];
const v9=v8;
const v10=v2;
const v11=v3;
/* inline right_word */
const v12=v9;
const v13=v11;
/* inline calibrate_right */
const v14=v12;
const v15=v13;
let v16;if(v15===0 ){
v16=0;}else{
v16=((v14%v15)+0);}
const v17=v16;
const v18=v11;
const v19=(((v17) + (v18)) >>> 0);
const v20=v6;
const v21=v2;
const v22=v3;
/* inline reduce_word */
const v23=v19;
const v24=v20;
const v25=v21;
const v26=v22;
/* inline mix_word */
const v27=v24;
const v28=v25;
let v29;if(((v27) < (v28))){
const v30=v23;
const v31=v24;
const v32=v26;
const v33=(Math.imul(v31,v32) >>> 0);
v29=(((v30) + (v33)) >>> 0);}else{
const v34=v23;
const v35=v24;
v29=(((v34) - (v35)) >>> 0);}
v6=v29;
}
let v36=v6;
for(let v37=v4.length-1;v37>=0;v37--){
const v38=v4[v37];
const v39=v38;
const v40=v2;
const v41=v3;
/* inline left_word */
const v42=v39;
const v43=v41;
/* inline calibrate_left */
const v44=v42;
const v45=v43;
let v46;if(v45===0 ){
v46=0;}else{
v46=(Math.trunc(v44/v45)+0);}
const v47=v46;
const v48=v40;
const v49=(((v47) + (v48)) >>> 0);
const v50=v36;
const v51=v2;
const v52=v3;
/* inline reduce_word */
const v53=v49;
const v54=v50;
const v55=v51;
const v56=v52;
/* inline mix_word */
const v57=v54;
const v58=v55;
let v59;if(((v57) < (v58))){
const v60=v53;
const v61=v54;
const v62=v56;
const v63=(Math.imul(v61,v62) >>> 0);
v59=(((v60) + (v63)) >>> 0);}else{
const v64=v53;
const v65=v54;
v59=(((v64) - (v65)) >>> 0);}
v36=v59;
}
return v36;}
function __fn1(v66,v67,v68){
const v69=v66;
const v70=v68;
/* inline calibrate_left */
const v71=v69;
const v72=v70;
let v73;if(v72===0 ){
v73=0;}else{
v73=(Math.trunc(v71/v72)+0);}
const v74=v73;
const v75=v67;
return (((v74) + (v75)) >>> 0);}
function __fn2(v76,v77){
const v78=v76;
const v79=v77;
let v80;if(v79===0 ){
v80=0;}else{
v80=(Math.trunc(v78/v79)+0);}
return v80;}
function __fn3(v81,v82,v83){
const v84=v81;
const v85=v83;
/* inline calibrate_right */
const v86=v84;
const v87=v85;
let v88;if(v87===0 ){
v88=0;}else{
v88=((v86%v87)+0);}
const v89=v88;
const v90=v83;
return (((v89) + (v90)) >>> 0);}
function __fn4(v91,v92){
const v93=v91;
const v94=v92;
let v95;if(v94===0 ){
v95=0;}else{
v95=((v93%v94)+0);}
return v95;}
function __fn5(v96,v97,v98,v99){
const v100=v96;
const v101=v97;
const v102=v98;
const v103=v99;
/* inline mix_word */
const v104=v101;
const v105=v102;
let v106;if(((v104) < (v105))){
const v107=v100;
const v108=v101;
const v109=v103;
const v110=(Math.imul(v108,v109) >>> 0);
v106=(((v107) + (v110)) >>> 0);}else{
const v111=v100;
const v112=v101;
v106=(((v111) - (v112)) >>> 0);}
return v106;}
function __fn6(v113,v114,v115,v116){
const v117=v114;
const v118=v115;
let v119;if(((v117) < (v118))){
const v120=v113;
const v121=v114;
const v122=v116;
const v123=(Math.imul(v121,v122) >>> 0);
v119=(((v120) + (v123)) >>> 0);}else{
const v124=v113;
const v125=v114;
v119=(((v124) - (v125)) >>> 0);}
return v119;}
const __namedTypes={};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v2","core_sha256":"663b7bbcfdc24bd43fe3faed284174ef0f4c049e328882da4835e8df9986ed48","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":null,"index":0,"internal":false,"name":"pipeline36_concat_ordered_heldout_u32","params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":1,"internal":false,"name":"left_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":2,"internal":false,"name":"calibrate_left","params":[{"name":"x","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":3,"internal":false,"name":"right_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":4,"internal":false,"name":"calibrate_right","params":[{"name":"x","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":5,"internal":false,"name":"reduce_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"acc","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":6,"internal":false,"name":"mix_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"acc","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}}],"named_types":{},"schema":1,"state":null};
const __implementations=[__fn0,__fn1,__fn2,__fn3,__fn4,__fn5,__fn6];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>[f.name,__implementations[f.index]])));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[null,null,null,null,null,null,null];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>[f.name,__intoImplementations[f.index]])));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}
