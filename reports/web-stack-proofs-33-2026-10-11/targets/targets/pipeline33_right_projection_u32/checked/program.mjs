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
let v13;if(((v11) < (v12))){
const v14=v9;
const v15=v3;
v13=(((v14) + (v15)) >>> 0);}else{
const v16=v9;
const v17=v3;
v13=(((v16) - (v17)) >>> 0);}
v7[v8]=v13;
}
return v7;}
function __fn1(v18,v19,v20){
const v21=v18;
const v22=v19;
let v23;if(((v21) < (v22))){
const v24=v18;
const v25=v20;
v23=(((v24) + (v25)) >>> 0);}else{
const v26=v18;
const v27=v20;
v23=(((v26) - (v27)) >>> 0);}
return v23;}
function __into0(v28,v29,v30,v31,v32){
const v33=v28;
const v34=v29;
const v35=Math.min(v33.length,v34.length);
for(let v37=0;v37<v35;v37++){
const v38=v33[v37];
const v39=v34[v37];
const v40=v38;
const v41=v30;
let v42;if(((v40) < (v41))){
const v43=v38;
const v44=v31;
v42=(((v43) + (v44)) >>> 0);}else{
const v45=v38;
const v46=v31;
v42=(((v45) - (v46)) >>> 0);}
v32[v37]=v42;
}
return v35;}
const __namedTypes={};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v2","core_sha256":"eb206c6c79fe4d3e4434d137e25adf0e7a28a8b17a58c8110b80c0081baff1f3","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":0,"internal":false,"name":"pipeline33_right_projection_u32","params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"element":{"kind":"u32"},"kind":"list"}},{"destination":null,"index":1,"internal":false,"name":"selected_word","params":[{"name":"x","type":{"kind":"u32"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"kind":"u32"}}],"named_types":{},"schema":1,"state":null};
const __implementations=[__fn0,__fn1];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>[f.name,__implementations[f.index]])));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[__into0,null];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>[f.name,__intoImplementations[f.index]])));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}
