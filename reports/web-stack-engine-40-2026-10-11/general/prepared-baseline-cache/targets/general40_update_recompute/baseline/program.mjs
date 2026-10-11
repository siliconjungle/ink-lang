function __fn0(v0,v1,v2,v3){
const v4=v0;
const v5=v4.length;
const v6=new Array(v5);
for(let v7=0;v7<v5;v7++){
const v8=v4[v7];
const v9=(v7>>>0);
const v10=v9;
const v11=v3;
let v12;if(v11===0 ){
v12=1;}else{
v12=((v10%v11)+0);}
const v13=v12;
const v14=0;
let v15;if(((v13) === (v14))){
const v16=v1;
const v17=v9;
let v18;if(v17<v16.length){v18=v16[v17];}else{
v18=v8;}
v15=v18;}else{
v15=v8;}
v6[v7]=v15;
}
return v6;}
function __into0(v19,v20,v21,v22,v23){
const v24=v19;
const v25=v24.length;
for(let v27=0;v27<v25;v27++){
const v28=v24[v27];
const v29=(v27>>>0);
const v30=v29;
const v31=v22;
let v32;if(v31===0 ){
v32=1;}else{
v32=((v30%v31)+0);}
const v33=v32;
const v34=0;
let v35;if(((v33) === (v34))){
const v36=v20;
const v37=v29;
let v38;if(v37<v36.length){v38=v36[v37];}else{
v38=v28;}
v35=v38;}else{
v35=v28;}
v23[v27]=v35;
}
return v25;}
const __namedTypes={};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v2","core_sha256":"364083e393eac6399a7dd754ead1afa86bca1889cd29b5600a0512191bdecf0b","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":0,"internal":false,"name":"general40_update_recompute","params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"ys","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"seed","type":{"kind":"u32"}},{"name":"k","type":{"kind":"u32"}}],"result":{"element":{"kind":"u32"},"kind":"list"}}],"named_types":{},"schema":1,"state":null};
const __implementations=[__fn0];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>[f.name,__implementations[f.index]])));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[__into0];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>[f.name,__intoImplementations[f.index]])));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}
