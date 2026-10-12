function __fn0(v0,v1){
const v2=v0;
let v3="missing";
for(let v4=0;v4<v2.length;v4++){
const v5=v2[v4];
const v6=v5;
const v7=v6;
const v8=v7["key"];
const v9=v1;
const v10=(v8===v9);
const v11=v5;
const v12=v11;
const v13=v12["key"];
const v14=v1;
let v15;if((v13===v14)){
const v16=v5;
const v17=v16;
v15=v17["label"];}else{
v15=v3;}
v3=v15;
if(v10)break;
}
return v3;}
const __namedTypes={"Node":{"fields":[{"name":"key","type":{"kind":"u32"}},{"name":"label","type":{"kind":"string"}},{"name":"active","type":{"kind":"bool"}}],"kind":"record","name":"Node"}};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v6","core_sha256":"df7d781dd817e91cd5b8cc71299413bc78e7b11827927ea503eb182e241153bd","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":null,"index":0,"internal":false,"name":"run","parallel":false,"params":[{"name":"xs","type":{"element":{"fields":[{"name":"key","type":{"kind":"u32"}},{"name":"label","type":{"kind":"string"}},{"name":"active","type":{"kind":"bool"}}],"kind":"record","name":"Node"},"kind":"list"}},{"name":"cut","type":{"kind":"u32"}}],"precondition":null,"result":{"kind":"string"}}],"named_types":{"Node":{"fields":[{"name":"key","type":{"kind":"u32"}},{"name":"label","type":{"kind":"string"}},{"name":"active","type":{"kind":"bool"}}],"kind":"record","name":"Node"}},"schema":1,"state":null};
const __implementations=[__fn0];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>[f.name,__implementations[f.index]])));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[null];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>[f.name,__intoImplementations[f.index]])));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}
