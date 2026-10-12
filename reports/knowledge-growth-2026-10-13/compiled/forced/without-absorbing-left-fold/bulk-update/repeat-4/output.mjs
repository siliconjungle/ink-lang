function __fn0(v0,v1){
const v2=v0;
const v3=v2.length;
const v4=new Array(v3);
for(let v5=0;v5<v3;v5++){
const v6=v2[v5];
const v7=v6;
const v8=v7["id"];
const v9=v6;
let v10;if(v9["active"]){
const v11=v6;
const v12=v11["value"];
const v13=v1;
v10=(((v12) + (v13)) >>> 0);}else{
const v14=v6;
v10=v14["value"];}
const v15=v10;
const v16=v6;
const v17=v16["active"];
v4[v5]=({["id"]:v8,["value"]:v15,["active"]:v17});
}
return v4;}
function __into0(v18,v19,v20){
const v21=v18;
const v22=v21.length;
for(let v24=0;v24<v22;v24++){
const v25=v21[v24];
const v26=v25;
const v27=v26["id"];
const v28=v25;
let v29;if(v28["active"]){
const v30=v25;
const v31=v30["value"];
const v32=v19;
v29=(((v31) + (v32)) >>> 0);}else{
const v33=v25;
v29=v33["value"];}
const v34=v29;
const v35=v25;
const v36=v35["active"];
v20[v24]=({["id"]:v27,["value"]:v34,["active"]:v36});
}
return v22;}
const __namedTypes={"Entity":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"value","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}}],"kind":"record","name":"Entity"}};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v2","core_sha256":"4974307099a2517e44d06e4cb6b5e2e8e64aefde0157c06cff2934fc58d01a37","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":{"abi":"ink-javascript-into-v1","count_unit":"elements","ownership":"caller-owned"},"index":0,"internal":false,"name":"run","parallel":false,"params":[{"name":"xs","type":{"element":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"value","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}}],"kind":"record","name":"Entity"},"kind":"list"}},{"name":"delta","type":{"kind":"u32"}}],"precondition":null,"result":{"element":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"value","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}}],"kind":"record","name":"Entity"},"kind":"list"}}],"named_types":{"Entity":{"fields":[{"name":"id","type":{"kind":"u32"}},{"name":"value","type":{"kind":"u32"}},{"name":"active","type":{"kind":"bool"}}],"kind":"record","name":"Entity"}},"schema":1,"state":null};
const __implementations=[__fn0];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>[f.name,__implementations[f.index]])));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[__into0];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>[f.name,__intoImplementations[f.index]])));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}
