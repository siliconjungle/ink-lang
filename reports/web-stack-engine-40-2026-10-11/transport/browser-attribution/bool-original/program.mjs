function __fn0(v0){
const v1=v0;
const v2=v1.length;
const v3=new Array(v2);
for(let v4=0;v4<v2;v4++){
const v5=v1[v4];
let v6;if(v5){
v6=false;}else{
v6=true;}
v3[v4]=v6;
}
const v7=v3;
const v8=v7.length;
const v9=v7;
let v10=0;
for(let v11=0;v11<v8;v11++){
const v12=v7[v11];
if(v12){v9[v10++]=v12;}
}
v9.length=v10;
return v9;}
function __into0(v13,v14){
const v15=v13;
const v16=v15.length;
const v17=new Array(v16);
for(let v18=0;v18<v16;v18++){
const v19=v15[v18];
let v20;if(v19){
v20=false;}else{
v20=true;}
v17[v18]=v20;
}
const v21=v17;
const v22=v21.length;
let v23=0;
for(let v24=0;v24<v22;v24++){
const v25=v21[v24];
if(v25){
v14[v23++]=v25;
}
}
return v23;}
const __namedTypes={};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v1","core_sha256":"b749135f7461866468b688b3f7adf4d1a4930b5f4d7184b628af48d5401d697f","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":0,"internal":false,"name":"flags","params":[{"name":"xs","type":{"element":{"kind":"bool"},"kind":"list"}}],"result":{"element":{"kind":"bool"},"kind":"list"}}],"named_types":{},"schema":1,"state":null};
const __implementations=[__fn0];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>[f.name,__implementations[f.index]])));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[__into0];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>[f.name,__intoImplementations[f.index]])));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}
