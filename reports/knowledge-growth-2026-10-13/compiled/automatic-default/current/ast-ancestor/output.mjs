function __fn0(v0,v1){
const v2=v0;
let v3="missing";
for(let v4=v2.length-1;v4>=0;v4--){
const v5=v2[v4];
const v6=v5;
const v7=v6["key"];
const v8=v1;
let v9;if((v7===v8)){
const v10=v5;
v9=v10["label"];}else{
v9=v3;}
v3=v9;
}
return v3;}
const __namedTypes={"Node":{"fields":[{"name":"key","type":{"kind":"u32"}},{"name":"label","type":{"kind":"string"}},{"name":"active","type":{"kind":"bool"}}],"kind":"record","name":"Node"}};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v8","core_sha256":"c0d643d6882adf3fb46e55fcfd2f1ac9c58bdc6ea6b54a4deb5096bcfa70a68a","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":null,"index":0,"internal":false,"name":"run","parallel":false,"params":[{"name":"xs","type":{"element":{"fields":[{"name":"key","type":{"kind":"u32"}},{"name":"label","type":{"kind":"string"}},{"name":"active","type":{"kind":"bool"}}],"kind":"record","name":"Node"},"kind":"list"}},{"name":"cut","type":{"kind":"u32"}}],"precondition":null,"result":{"kind":"string"}}],"named_types":{"Node":{"fields":[{"name":"key","type":{"kind":"u32"}},{"name":"label","type":{"kind":"string"}},{"name":"active","type":{"kind":"bool"}}],"kind":"record","name":"Node"}},"schema":1,"state":null};
const __implementations=[__fn0];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>[f.name,__implementations[f.index]])));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[null];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>[f.name,__intoImplementations[f.index]])));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}
