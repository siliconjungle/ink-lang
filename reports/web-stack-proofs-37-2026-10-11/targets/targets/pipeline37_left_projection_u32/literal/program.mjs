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
/* inline discarded_index */
const v14=v10;
const v15=v12;
let v16;if(((v14) < (v15))){
const v17=v11;
const v18=v13;
const v19=(((v17) + (v18)) >>> 0);
const v20=v10;
v16=(((v19) + (v20)) >>> 0);}else{
const v21=v11;
const v22=v12;
v16=(((v21) - (v22)) >>> 0);}
v6[v7]=v16;
}
const v23=v6;
const v24=v1;
const v25=Math.min(v23.length,v24.length);
const v26=new Array(v25);
for(let v27=0;v27<v25;v27++){
const v28=v23[v27];
const v29=v24[v27];
const v30=v29;
const v31=v2;
const v32=v3;
/* inline selected_word */
const v33=v30;
const v34=v31;
let v35;if(((v33) < (v34))){
const v36=v30;
const v37=v32;
v35=(((v36) + (v37)) >>> 0);}else{
const v38=v30;
const v39=v32;
v35=(((v38) - (v39)) >>> 0);}
v26[v27]=v35;
}
return v26;}
function __fn1(v40,v41,v42,v43){
const v44=v40;
const v45=v42;
let v46;if(((v44) < (v45))){
const v47=v41;
const v48=v43;
const v49=(((v47) + (v48)) >>> 0);
const v50=v40;
v46=(((v49) + (v50)) >>> 0);}else{
const v51=v41;
const v52=v42;
v46=(((v51) - (v52)) >>> 0);}
return v46;}
function __fn2(v53,v54,v55){
const v56=v53;
const v57=v54;
let v58;if(((v56) < (v57))){
const v59=v53;
const v60=v55;
v58=(((v59) + (v60)) >>> 0);}else{
const v61=v53;
const v62=v55;
v58=(((v61) - (v62)) >>> 0);}
return v58;}
function __into0(v63,v64,v65,v66,v67){
const v68=v63;
const v69=v68.length;
const v70=new Array(v69);
for(let v71=0;v71<v69;v71++){
const v72=v68[v71];
const v73=(v71>>>0);
const v74=v73;
const v75=v72;
const v76=v65;
const v77=v66;
/* inline discarded_index */
const v78=v74;
const v79=v76;
let v80;if(((v78) < (v79))){
const v81=v75;
const v82=v77;
const v83=(((v81) + (v82)) >>> 0);
const v84=v74;
v80=(((v83) + (v84)) >>> 0);}else{
const v85=v75;
const v86=v76;
v80=(((v85) - (v86)) >>> 0);}
v70[v71]=v80;
}
const v87=v70;
const v88=v64;
const v89=Math.min(v87.length,v88.length);
for(let v91=0;v91<v89;v91++){
const v92=v87[v91];
const v93=v88[v91];
const v94=v93;
const v95=v65;
const v96=v66;
/* inline selected_word */
const v97=v94;
const v98=v95;
let v99;if(((v97) < (v98))){
const v100=v94;
const v101=v96;
v99=(((v100) + (v101)) >>> 0);}else{
const v102=v94;
const v103=v96;
v99=(((v102) - (v103)) >>> 0);}
v67[v91]=v99;
}
return v89;}
const __namedTypes={};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v2","core_sha256":"4ab0c0230bdc50e710531390f7906afe96d4d467db9fd974b9e91d37a5be3ab1","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":0,"internal":false,"name":"pipeline37_left_projection_u32","params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"element":{"kind":"u32"},"kind":"list"}},{"destination":null,"index":1,"internal":false,"name":"discarded_index","params":[{"name":"i","type":{"kind":"u32"}},{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":2,"internal":false,"name":"selected_word","params":[{"name":"y","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}}],"named_types":{},"schema":1,"state":null};
const __implementations=[__fn0,__fn1,__fn2];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>[f.name,__implementations[f.index]])));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[__into0,null,null];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>[f.name,__intoImplementations[f.index]])));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}
