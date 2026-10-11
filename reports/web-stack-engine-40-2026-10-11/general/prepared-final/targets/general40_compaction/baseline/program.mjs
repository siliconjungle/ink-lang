function __fn0(v0,v1,v2,v3){
const v4=v0;
const v5=v4.length;
const v6=[];
for(let v7=0;v7<v5;v7++){
const v8=v4[v7];
const v9=v8;
const v10=16;
let v11;if(v10===0 ){
v11=0;}else{
v11=((v9%v10)+0);}
const v12=v11;
const v13=v2;
if(((v12) < (v13))){v6.push(v8);}
}
const v14=v6;
const v15=v14.length;
const v16=v14;
for(let v17=0;v17<v15;v17++){
const v18=v14[v17];
const v19=v18;
const v20=v3;
const v21=(Math.imul(v19,v20) >>> 0);
const v22=1;
v16[v17]=(((v21) + (v22)) >>> 0);
}
return v16;}
function __into0(v23,v24,v25,v26,v27){
const v28=v23;
const v29=v28.length;
let v30=0;
for(let v31=0;v31<v29;v31++){
const v32=v28[v31];
const v33=v32;
const v34=16;
let v35;if(v34===0 ){
v35=0;}else{
v35=((v33%v34)+0);}
const v36=v35;
const v37=v25;
if(((v36) < (v37))){
v27[v30++]=v32;
}
}
for(let v39=0;v39<v30;v39++){
const v40=v27[v39];
const v41=v40;
const v42=v26;
const v43=(Math.imul(v41,v42) >>> 0);
const v44=1;
v27[v39]=(((v43) + (v44)) >>> 0);
}
return v30;}
const __namedTypes={};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v2","core_sha256":"ebf608987da15475bc7d262e45e65570fdcf0c1cceabe287b89b49f93466421f","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":0,"internal":false,"name":"general40_compaction","params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"element":{"kind":"u32"},"kind":"list"}}],"named_types":{},"schema":1,"state":null};
const __implementations=[__fn0];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>[f.name,__implementations[f.index]])));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[__into0];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>[f.name,__intoImplementations[f.index]])));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}
