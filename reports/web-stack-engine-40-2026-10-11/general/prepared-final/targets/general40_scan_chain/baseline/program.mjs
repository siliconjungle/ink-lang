function __fn0(v0,v1,v2,v3){
const v4=v0;
const v5=v4.length;
const v6=new Array(v5);
for(let v7=0;v7<v5;v7++){
const v8=v4[v7];
const v9=v8;
const v10=v2;
const v11=v3;
/* inline scan_word */
const v12=v9;
const v13=v11;
/* inline calibrate_word */
const v14=v12;
const v15=v13;
let v16;if(v15===0 ){
v16=0;}else{
v16=(Math.trunc(v14/v15)+0);}
const v17=v16;
const v18=v12;
const v19=(((v17) + (v18)) >>> 0);
const v20=v10;
v6[v7]=(((v19) + (v20)) >>> 0);
}
const v21=v6;
const v22=v21.length;
const v23=v21;
let v24=0;
for(let v25=0;v25<v22;v25++){
const v26=v21[v25];
v24=(((v24) + (v26)) >>> 0);v23[v25]=v24;}
return v23;}
function __fn1(v27,v28){
const v29=v27;
const v30=v28;
let v31;if(v30===0 ){
v31=0;}else{
v31=(Math.trunc(v29/v30)+0);}
const v32=v31;
const v33=v27;
return (((v32) + (v33)) >>> 0);}
function __fn2(v34,v35,v36){
const v37=v34;
const v38=v36;
/* inline calibrate_word */
const v39=v37;
const v40=v38;
let v41;if(v40===0 ){
v41=0;}else{
v41=(Math.trunc(v39/v40)+0);}
const v42=v41;
const v43=v37;
const v44=(((v42) + (v43)) >>> 0);
const v45=v35;
return (((v44) + (v45)) >>> 0);}
function __into0(v46,v47,v48,v49,v50){
const v51=v46;
const v52=v51.length;
for(let v54=0;v54<v52;v54++){
const v55=v51[v54];
const v56=v55;
const v57=v48;
const v58=v49;
/* inline scan_word */
const v59=v56;
const v60=v58;
/* inline calibrate_word */
const v61=v59;
const v62=v60;
let v63;if(v62===0 ){
v63=0;}else{
v63=(Math.trunc(v61/v62)+0);}
const v64=v63;
const v65=v59;
const v66=(((v64) + (v65)) >>> 0);
const v67=v57;
v50[v54]=(((v66) + (v67)) >>> 0);
}
let v68=0;
for(let v69=0;v69<v52;v69++){
const v70=v50[v69];
v68=(((v68) + (v70)) >>> 0);
v50[v69]=v68;
}
return v52;}
const __namedTypes={};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v2","core_sha256":"9f298c812f35832596280ced4ee32d330d5cc33f7ca13616ae96d3ec85bada7f","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":0,"internal":false,"name":"general40_scan_chain","params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"element":{"kind":"u32"},"kind":"list"}},{"destination":null,"index":1,"internal":false,"name":"calibrate_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}},{"destination":null,"index":2,"internal":false,"name":"scan_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}}],"named_types":{},"schema":1,"state":null};
const __implementations=[__fn0,__fn1,__fn2];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>[f.name,__implementations[f.index]])));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[__into0,null,null];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>[f.name,__intoImplementations[f.index]])));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}
