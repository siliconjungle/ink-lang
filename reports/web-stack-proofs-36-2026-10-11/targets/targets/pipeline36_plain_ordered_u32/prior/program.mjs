function __fn0(v0,v1,v2,v3){
const v4=v0;
const v5=v4.length;
const v6=new Array(v5);
for(let v7=0;v7<v5;v7++){
const v8=v4[v7];
const v9=v8;
const v10=v2;
const v11=v3;
/* inline left_word */
const v12=v9;
const v13=v11;
/* inline calibrate_left */
const v14=v12;
const v15=v13;
let v16;if(v15===0 ){
v16=0;}else{
v16=(Math.trunc(v14/v15)+0);}
const v17=v16;
const v18=v10;
v6[v7]=(((v17) + (v18)) >>> 0);
}
const v19=v6;
let v20=v2;
for(let v21=v19.length-1;v21>=0;v21--){
const v22=v19[v21];
const v23=v22;
const v24=v20;
const v25=v2;
const v26=v3;
/* inline reduce_word */
const v27=v23;
const v28=v24;
const v29=v25;
const v30=v26;
/* inline mix_word */
const v31=v28;
const v32=v29;
let v33;if(((v31) < (v32))){
const v34=v27;
const v35=v28;
const v36=v30;
const v37=(Math.imul(v35,v36) >>> 0);
v33=(((v34) + (v37)) >>> 0);}else{
const v38=v27;
const v39=v28;
v33=(((v38) - (v39)) >>> 0);}
v20=v33;
}
return v20;}
function __fn1(v40,v41,v42){
const v43=v40;
const v44=v42;
/* inline calibrate_left */
const v45=v43;
const v46=v44;
let v47;if(v46===0 ){
v47=0;}else{
v47=(Math.trunc(v45/v46)+0);}
const v48=v47;
const v49=v41;
return (((v48) + (v49)) >>> 0);}
function __fn2(v50,v51){
const v52=v50;
const v53=v51;
let v54;if(v53===0 ){
v54=0;}else{
v54=(Math.trunc(v52/v53)+0);}
return v54;}
function __fn3(v55,v56,v57){
const v58=v55;
const v59=v57;
/* inline calibrate_right */
const v60=v58;
const v61=v59;
let v62;if(v61===0 ){
v62=0;}else{
v62=((v60%v61)+0);}
const v63=v62;
const v64=v57;
return (((v63) + (v64)) >>> 0);}
function __fn4(v65,v66){
const v67=v65;
const v68=v66;
let v69;if(v68===0 ){
v69=0;}else{
v69=((v67%v68)+0);}
return v69;}
function __fn5(v70,v71,v72,v73){
const v74=v70;
const v75=v71;
const v76=v72;
const v77=v73;
/* inline mix_word */
const v78=v75;
const v79=v76;
let v80;if(((v78) < (v79))){
const v81=v74;
const v82=v75;
const v83=v77;
const v84=(Math.imul(v82,v83) >>> 0);
v80=(((v81) + (v84)) >>> 0);}else{
const v85=v74;
const v86=v75;
v80=(((v85) - (v86)) >>> 0);}
return v80;}
function __fn6(v87,v88,v89,v90){
const v91=v88;
const v92=v89;
let v93;if(((v91) < (v92))){
const v94=v87;
const v95=v88;
const v96=v90;
const v97=(Math.imul(v95,v96) >>> 0);
v93=(((v94) + (v97)) >>> 0);}else{
const v98=v87;
const v99=v88;
v93=(((v98) - (v99)) >>> 0);}
return v93;}
const __namedTypes={};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v2","core_sha256":"2af63f26ffaf3c63674fd8d37392b1f120959a5efd775ea1c7892abea48160db","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":null,"index":0,"internal":false,"name":"pipeline36_plain_ordered_u32","params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":1,"internal":false,"name":"left_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":2,"internal":false,"name":"calibrate_left","params":[{"name":"x","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":3,"internal":false,"name":"right_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":4,"internal":false,"name":"calibrate_right","params":[{"name":"x","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":5,"internal":false,"name":"reduce_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"acc","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":6,"internal":false,"name":"mix_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"acc","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}}],"named_types":{},"schema":1,"state":null};
const __implementations=[__fn0,__fn1,__fn2,__fn3,__fn4,__fn5,__fn6];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>[f.name,__implementations[f.index]])));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[null,null,null,null,null,null,null];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>[f.name,__intoImplementations[f.index]])));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}
