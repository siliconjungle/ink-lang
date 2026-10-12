function __fn0(v0,v1){
const v2=v0;
let v3=true;
for(let v4=0;v4<v2.length;v4++){
const v5=v2[v4];
let v6;if(v3){
v6=false;}else{
v6=true;}
const v7=v6;
const v8=v3;
let v9=v8;if(v9){
const v10=v5;
const v11=v10;
const v12=v1;
v9=((v11) < (v12));}
v3=v9;
if(v7)break;
}
return v3;}
const __namedTypes={};
export const metadata = {"abi":"ink-javascript-trusted-values-v2","backend":"javascript","core_semantics":"ink-executable-core-v6","core_sha256":"c8dd093c40b3cac125679d079d005f1bb6833c336deb76f9ca8ef7775b207451","destination_abi":{"aliasing":"destination-disjoint-from-all-reachable-inputs","capacity":"trusted","count_unit":"elements","name":"ink-javascript-into-v1","ownership":"caller-owned","tail":"unwritten"},"functions":[{"destination":null,"index":0,"internal":false,"name":"run","parallel":false,"params":[{"name":"xs","type":{"element":{"kind":"u32"},"kind":"list"}},{"name":"cut","type":{"kind":"u32"}}],"precondition":null,"result":{"kind":"bool"}}],"named_types":{},"schema":1,"state":null};
const __implementations=[__fn0];

function __freeze(v) { if(v && typeof v==='object') {Object.values(v).forEach(__freeze);Object.freeze(v);} return v; }
__freeze(metadata);
export const functions = Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal).map(f=>[f.name,__implementations[f.index]])));
export function call(name,args) { return functions[name](...args); }
const __intoImplementations=[null];
export const functionsInto=Object.freeze(Object.fromEntries(metadata.functions.filter(f=>!f.internal&&f.result.kind==='list').map(f=>[f.name,__intoImplementations[f.index]])));
export function callInto(name,args,destination){return functionsInto[name](...args,destination);}
