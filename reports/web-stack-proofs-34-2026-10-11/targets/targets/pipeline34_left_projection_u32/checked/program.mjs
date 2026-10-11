function __fn0(v0,v1,v2,v3){
const v4=v0;
const v5=v1;
const v6=Math.min(v4.length,v5.length);
const v7=new Array(v6);
for(let v8=0;v8<v6;v8++){
const v9=v4[v8];
const v10=v5[v8];
const v11=v10;
const v12=v2;
const v13=v3;
/* inline selected_word */
const v14=v11;
const v15=v12;
const v16=v13;
/* inline repair_word */
const v17=v14;
const v18=v15;
let v19;if(((v17) < (v18))){
const v20=v14;
const v21=v16;
v19=(((v20) + (v21)) >>> 0);}else{
const v22=v14;
const v23=v16;
v19=(((v22) - (v23)) >>> 0);}
v7[v8]=v19;
}
return v7;}
function __fn1(v24,v25,v26){
const v27=v24;
const v28=v26;
/* inline calibrate_word */
const v29=v27;
const v30=v28;
let v31;if(v30===0 ){
v31=0;}else{
v31=(Math.trunc(v29/v30)+0);}
const v32=v31;
const v33=v27;
const v34=v28;
let v35;if(v34===0 ){
v35=0;}else{
v35=((v33%v34)+0);}
const v36=v35;
const v37=(((v32) + (v36)) >>> 0);
const v38=v25;
return (((v37) + (v38)) >>> 0);}
function __fn2(v39,v40){
const v41=v39;
const v42=v40;
let v43;if(v42===0 ){
v43=0;}else{
v43=(Math.trunc(v41/v42)+0);}
const v44=v43;
const v45=v39;
const v46=v40;
let v47;if(v46===0 ){
v47=0;}else{
v47=((v45%v46)+0);}
const v48=v47;
return (((v44) + (v48)) >>> 0);}
function __fn3(v49,v50,v51){
const v52=v49;
const v53=v50;
const v54=v51;
/* inline repair_word */
const v55=v52;
const v56=v53;
let v57;if(((v55) < (v56))){
const v58=v52;
const v59=v54;
v57=(((v58) + (v59)) >>> 0);}else{
const v60=v52;
const v61=v54;
v57=(((v60) - (v61)) >>> 0);}
return v57;}
function __fn4(v62,v63,v64){
const v65=v62;
const v66=v63;
let v67;if(((v65) < (v66))){
const v68=v62;
const v69=v64;
v67=(((v68) + (v69)) >>> 0);}else{
const v70=v62;
const v71=v64;
v67=(((v70) - (v71)) >>> 0);}
return v67;}
function __into0(v72,v73,v74,v75,v76){
const v77=v72;
const v78=v73;
const v79=Math.min(v77.length,v78.length);
for(let v81=0;v81<v79;v81++){
const v82=v77[v81];
const v83=v78[v81];
const v84=v83;
const v85=v74;
const v86=v75;
/* inline selected_word */
const v87=v84;
const v88=v85;
const v89=v86;
/* inline repair_word */
const v90=v87;
const v91=v88;
let v92;if(((v90) < (v91))){
const v93=v87;
const v94=v89;
v92=(((v93) + (v94)) >>> 0);}else{
const v95=v87;
const v96=v89;
v92=(((v95) - (v96)) >>> 0);}
v76[v81]=v92;
}
return v79;}
const __namedTypes={};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v2","core_sha256":"68666a018a311d23b4544e7cb58a9b3dec99f54eeb214b4cfd8abf8b9ca2c2b3","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":0,"internal":false,"name":"pipeline34_left_projection_u32","params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"element":{"kind":"u32"},"kind":"list"}},{"destination":null,"index":1,"internal":false,"name":"discarded_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":2,"internal":false,"name":"calibrate_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":3,"internal":false,"name":"selected_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":4,"internal":false,"name":"repair_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}}],"named_types":{},"schema":1,"state":null};
const __implementations=[__fn0,__fn1,__fn2,__fn3,__fn4];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>[f.name,__implementations[f.index]])));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[__into0,null,null,null,null];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>[f.name,__intoImplementations[f.index]])));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}
