function __fn0(v0,v1,v2,v3){
const v4=v0;
const v5=v4.length;
const v6=new Array(v5);
for(let v7=0;v7<v5;v7++){
const v8=v4[v7];
const v9=(v7>>>0);
const v10=v0;
const v11=v9;
const v12=1;
const v13=(((v11) - (v12)) >>> 0);
let v14;if(v13<v10.length){v14=v10[v13];}else{
v14=0;}
const v15=v14;
const v16=v8;
const v17=v3;
const v18=(Math.imul(v16,v17) >>> 0);
const v19=(((v15) + (v18)) >>> 0);
const v20=v0;
const v21=v9;
const v22=1;
const v23=(((v21) + (v22)) >>> 0);
let v24;if(v23<v20.length){v24=v20[v23];}else{
v24=0;}
const v25=v24;
v6[v7]=(((v19) + (v25)) >>> 0);
}
return v6;}
function __into0(v26,v27,v28,v29,v30){
const v31=v26;
const v32=v31.length;
for(let v34=0;v34<v32;v34++){
const v35=v31[v34];
const v36=(v34>>>0);
const v37=v26;
const v38=v36;
const v39=1;
const v40=(((v38) - (v39)) >>> 0);
let v41;if(v40<v37.length){v41=v37[v40];}else{
v41=0;}
const v42=v41;
const v43=v35;
const v44=v29;
const v45=(Math.imul(v43,v44) >>> 0);
const v46=(((v42) + (v45)) >>> 0);
const v47=v26;
const v48=v36;
const v49=1;
const v50=(((v48) + (v49)) >>> 0);
let v51;if(v50<v47.length){v51=v47[v50];}else{
v51=0;}
const v52=v51;
v30[v34]=(((v46) + (v52)) >>> 0);
}
return v32;}
const __namedTypes={};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v2","core_sha256":"517e03cc87e88e55fac495804c91f3814e400fc19f7b666a8bb931e215c12167","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":0,"internal":false,"name":"general40_stencil","params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"element":{"kind":"u32"},"kind":"list"}}],"named_types":{},"schema":1,"state":null};
const __implementations=[__fn0];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>[f.name,__implementations[f.index]])));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[__into0];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>[f.name,__intoImplementations[f.index]])));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}
