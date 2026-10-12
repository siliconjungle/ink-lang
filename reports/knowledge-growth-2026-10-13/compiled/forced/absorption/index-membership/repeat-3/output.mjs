function __fn0(v0,v1){
const v2=v0;
let v3=false;
for(let v4=0;v4<v2.length;v4++){
const v5=v2[v4];
const v6=v3;
const v7=v3;
let v8=v7;if(!v8){
const v9=v5;
const v10=v9;
const v11=v1;
v8=(v10===v11);}
v3=v8;
if(v6)break;
}
return v3;}
function __fn1(v12,v13){
const v14=v12;
const v15=v13;
return __fn0(v14,v15);}
const __namedTypes={};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v6","core_sha256":"309ea71aa180f9e7c61e2ed3f75ab5c74bf2c635e0f5557fd82e345769158108","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":null,"index":0,"internal":false,"name":"contains","parallel":false,"params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"x","type":{"kind":"u32"}}],"precondition":null,"result":{"kind":"bool"}},{"destination":null,"index":1,"internal":false,"name":"run","parallel":false,"params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"target","type":{"kind":"u32"}}],"precondition":null,"result":{"kind":"bool"}}],"named_types":{},"schema":1,"state":null};
const __implementations=[__fn0,__fn1];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>[f.name,__implementations[f.index]])));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[null,null];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>[f.name,__intoImplementations[f.index]])));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}
