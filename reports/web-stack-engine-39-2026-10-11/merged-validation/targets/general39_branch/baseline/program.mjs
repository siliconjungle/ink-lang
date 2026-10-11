function __fn0(v0,v1,v2,v3){
const v4=v0;
const v5=v4.length;
const v6=new Array(v5);
for(let v7=0;v7<v5;v7++){
const v8=v4[v7];
const v9=v8;
const v10=v2;
let v11;if(((v9) < (v10))){
const v12=v8;
const v13=v3;
const v14=(Math.imul(v12,v13) >>> 0);
const v15=1;
v11=(((v14) + (v15)) >>> 0);}else{
const v16=v8;
const v17=v3;
let v18;if(v17===0 ){
v18=0;}else{
v18=(Math.trunc(v16/v17)+0);}
const v19=v18;
const v20=v2;
v11=(((v19) + (v20)) >>> 0);}
v6[v7]=v11;
}
return v6;}
function __into0(v21,v22,v23,v24,v25){
const v26=v21;
const v27=v26.length;
for(let v29=0;v29<v27;v29++){
const v30=v26[v29];
const v31=v30;
const v32=v23;
let v33;if(((v31) < (v32))){
const v34=v30;
const v35=v24;
const v36=(Math.imul(v34,v35) >>> 0);
const v37=1;
v33=(((v36) + (v37)) >>> 0);}else{
const v38=v30;
const v39=v24;
let v40;if(v39===0 ){
v40=0;}else{
v40=(Math.trunc(v38/v39)+0);}
const v41=v40;
const v42=v23;
v33=(((v41) + (v42)) >>> 0);}
v25[v29]=v33;
}
return v27;}
const __namedTypes={};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v2","core_sha256":"1f50da768fe2af2148e3c8b42af9dc087b12ec632722fc2e3f5cced79645ff9a","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":0,"internal":false,"name":"general39_branch","params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"element":{"kind":"u32"},"kind":"list"}}],"named_types":{},"schema":1,"state":null};
const __implementations=[__fn0];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>[f.name,__implementations[f.index]])));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[__into0];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>[f.name,__intoImplementations[f.index]])));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}
