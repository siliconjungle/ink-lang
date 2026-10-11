function __fn0(v0,v1,v2,v3){
const v4=v0;
const v5=v1;
const v6=v5.length;
const v7=new Array(v6);
for(let v8=0;v8<v6;v8++){
const v9=v5[v8];
const v10=(v8>>>0);
const v11=v10;
const v12=v9;
const v13=v2;
const v14=v3;
/* inline discarded_index */
const v15=v11;
const v16=v13;
let v17;if(((v15) < (v16))){
const v18=v12;
const v19=v14;
const v20=(((v18) + (v19)) >>> 0);
const v21=v11;
v17=(((v20) + (v21)) >>> 0);}else{
const v22=v12;
const v23=v13;
v17=(((v22) - (v23)) >>> 0);}
v7[v8]=v17;
}
const v24=v7;
const v25=Math.min(v4.length,v24.length);
const v26=new Array(v25);
for(let v27=0;v27<v25;v27++){
const v28=v4[v27];
const v29=v24[v27];
const v30=v28;
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
const v69=v64;
const v70=v69.length;
const v71=new Array(v70);
for(let v72=0;v72<v70;v72++){
const v73=v69[v72];
const v74=(v72>>>0);
const v75=v74;
const v76=v73;
const v77=v65;
const v78=v66;
/* inline discarded_index */
const v79=v75;
const v80=v77;
let v81;if(((v79) < (v80))){
const v82=v76;
const v83=v78;
const v84=(((v82) + (v83)) >>> 0);
const v85=v75;
v81=(((v84) + (v85)) >>> 0);}else{
const v86=v76;
const v87=v77;
v81=(((v86) - (v87)) >>> 0);}
v71[v72]=v81;
}
const v88=v71;
const v89=Math.min(v68.length,v88.length);
for(let v91=0;v91<v89;v91++){
const v92=v68[v91];
const v93=v88[v91];
const v94=v92;
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
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v2","core_sha256":"b8c3de22912da5fd8a97e9bd22bef66f99b8ef9b4c55eb19cd7f4dfd8e89f6da","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":0,"internal":false,"name":"pipeline37_right_projection_u32","params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"element":{"kind":"u32"},"kind":"list"}},{"destination":null,"index":1,"internal":false,"name":"discarded_index","params":[{"name":"i","type":{"kind":"u32"}},{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":2,"internal":false,"name":"selected_word","params":[{"name":"y","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}}],"named_types":{},"schema":1,"state":null};
const __implementations=[__fn0,__fn1,__fn2];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>[f.name,__implementations[f.index]])));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[__into0,null,null];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>[f.name,__intoImplementations[f.index]])));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}
