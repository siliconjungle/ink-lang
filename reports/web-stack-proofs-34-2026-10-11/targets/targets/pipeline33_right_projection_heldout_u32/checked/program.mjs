function __fn0(v0,v1,v2,v3){
const v4=v0;
const v5=v1;
const v6=Math.min(v4.length,v5.length);
const v7=new Array(v6);
for(let v8=0;v8<v6;v8++){
const v9=v4[v8];
const v10=v5[v8];
const v11=v9;
const v12=v2;
const v13=v3;
/* inline selected_word */
const v14=v11;
const v15=v12;
let v16;if(((v14) < (v15))){
const v17=v11;
const v18=v13;
let v19;if(v18===0 ){
v19=0;}else{
v19=(Math.trunc(v17/v18)+0);}
const v20=v19;
const v21=v12;
v16=(((v20) + (v21)) >>> 0);}else{
const v22=v11;
const v23=v13;
let v24;if(v23===0 ){
v24=0;}else{
v24=((v22%v23)+0);}
const v25=v24;
const v26=v13;
v16=(((v25) + (v26)) >>> 0);}
v7[v8]=v16;
}
return v7;}
function __fn1(v27,v28,v29){
const v30=v27;
const v31=v28;
let v32;if(((v30) < (v31))){
const v33=v27;
const v34=v29;
let v35;if(v34===0 ){
v35=0;}else{
v35=(Math.trunc(v33/v34)+0);}
const v36=v35;
const v37=v28;
v32=(((v36) + (v37)) >>> 0);}else{
const v38=v27;
const v39=v29;
let v40;if(v39===0 ){
v40=0;}else{
v40=((v38%v39)+0);}
const v41=v40;
const v42=v29;
v32=(((v41) + (v42)) >>> 0);}
return v32;}
function __fn2(v43,v44,v45){
const v46=v43;
const v47=v45;
let v48;if(v47===0 ){
v48=0;}else{
v48=(Math.trunc(v46/v47)+0);}
const v49=v48;
const v50=v43;
const v51=v45;
let v52;if(v51===0 ){
v52=0;}else{
v52=((v50%v51)+0);}
const v53=v52;
const v54=(((v49) + (v53)) >>> 0);
const v55=v44;
return (((v54) + (v55)) >>> 0);}
function __into0(v56,v57,v58,v59,v60){
const v61=v56;
const v62=v57;
const v63=Math.min(v61.length,v62.length);
for(let v65=0;v65<v63;v65++){
const v66=v61[v65];
const v67=v62[v65];
const v68=v66;
const v69=v58;
const v70=v59;
/* inline selected_word */
const v71=v68;
const v72=v69;
let v73;if(((v71) < (v72))){
const v74=v68;
const v75=v70;
let v76;if(v75===0 ){
v76=0;}else{
v76=(Math.trunc(v74/v75)+0);}
const v77=v76;
const v78=v69;
v73=(((v77) + (v78)) >>> 0);}else{
const v79=v68;
const v80=v70;
let v81;if(v80===0 ){
v81=0;}else{
v81=((v79%v80)+0);}
const v82=v81;
const v83=v70;
v73=(((v82) + (v83)) >>> 0);}
v60[v65]=v73;
}
return v63;}
const __namedTypes={};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v2","core_sha256":"72a5869928cc1cde3d1880eb742b913cb2bf470dcdb575c6e41d0146f142c41a","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":0,"internal":false,"name":"pipeline33_right_projection_heldout_u32","params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"element":{"kind":"u32"},"kind":"list"}},{"destination":null,"index":1,"internal":false,"name":"selected_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":2,"internal":false,"name":"discarded_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}}],"named_types":{},"schema":1,"state":null};
const __implementations=[__fn0,__fn1,__fn2];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>[f.name,__implementations[f.index]])));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[__into0,null,null];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>[f.name,__intoImplementations[f.index]])));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}
